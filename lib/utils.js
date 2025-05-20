const _ = require('lodash')
const stream = require('stream')
const es = require('event-stream')
const JSONStream = require('JSONStream')
const aws = require('aws-sdk')
const uuid = require('uuid')
const fs = require('fs')

const RX_S3 = /^(?:s3:\/\/|https:\/\/s3.amazonaws.com\/)([^/]+)\/([^?]+)(?:\?offset=(\d+)&length=(\d+))?$/i
const RX_FILE = /^file:\/\/(.+)$/
const RX_DASHES = /-/g
const OBJECT_SOURCE_KEY = '$src'

/**
 * Wait for each stream in input to finish writing based on "writing" flag
 * and return the list of streams
 * @param writeStreams
 * @param maxWait
 * @return {Promise}
 */
function finalizeStreams(writeStreams, maxWait = 25000){
	return new Promise((resolve, reject) => {
		const promises = writeStreams.map(writeStream => new Promise((resolve, reject) => {
			// if stream doesn't have "writing" flag, resolve immediately
			if (!writeStream.hasOwnProperty('writing')) {
				return resolve(writeStream)
			}

			const s = Date.now()

			// writer's 'end' callback is emitted manually when reader's 'end' listener is
			// called. This means that reader passed all data to writer, but doesn't mean
			// that writer is done writing/uploading this data. Here we wait for "writing"
			// flag in write stream to become "true". This flag is implemented on node's
			// fs.createWriteSteam stream and is implemented manually in createWriteStream
			// function. If we don't wait and call "resolve" immediately, some data may
			// not be written/uploaded to destination
			const iId = setInterval(() => {
				if (!writeStream.writing || (maxWait && Date.now() - s > maxWait)) {
					clearInterval(iId)
					resolve(writeStream)
				}
			}, 40)
		}))

		Promise.all(promises)
			.then(resolve)
			.catch(reject)
	})
}

class ArrayWriteableStream extends stream.Writable {
	constructor() {
		super({ objectMode: true })
		this.items = []
	}

	_write(data, encoding, done) {
		this.items.push(data)
		done()
	}
}

function createReadStream(source) {
	if (typeof source !== 'string' || !source.length) {
		throw new TypeError('url argument must be a non-empty String')
	}

	if (RX_S3.test(source)) {
		const m = source.match(RX_S3)

		const offset = m[3] ? +m[3] : null
		const length = m[4] ? +m[4] : null
		const params = {
			Bucket: m[1],
			Key: m[2],
			Range: offset !== null && length !== null ? `bytes=${offset}-${offset + length}` : undefined
		}

		const s3 = new aws.S3()
		return s3.getObject(params).createReadStream()
	} else if (fs.existsSync(source)) {
		return fs.createReadStream(source)
	} else {
		throw new Error('Unexpected source format: ' + url)
	}
}

function createReadArrayStream(source) {
	if (Array.isArray(source)) {
		return es.readArray(source)
	} else {
		return createReadStream(source).pipe(JSONStream.parse('*'))
	}
}

function createWriteStream(destination, cb) {
	if (!destination) {
		throw new TypeError('destination argument required')
	}

	if (!destination.bucketName) {
		throw new TypeError('destination.bucketName argument required')
	}

	if (!destination.keyPrefix) {
		throw new TypeError('destination.keyPrefix argument required')
	}

	if (cb && typeof cb !== 'function') {
		throw new TypeError('cb argument, when provided, must be a Function')
	}

	const passThroughStream = new stream.PassThrough()

	if (cb) {
		passThroughStream.on('error', cb)
	}

	const s3 = new aws.S3()

	const params = {
		Bucket: destination.bucketName,
		Key: destination.key ? destination.key : destination.keyPrefix + uuid.v4(),
		Body: passThroughStream,
		ContentType: destination.contentType ? destination.contentType : 'application/json',
	}

	const uploadingTo = `s3://${params.Bucket}/${params.Key}`

	passThroughStream.writing = true

	s3.upload(params, function (err, data) {
		passThroughStream.writing = false

		if (err) {
			throw err
		} else {
			data[OBJECT_SOURCE_KEY] = uploadingTo
			passThroughStream[OBJECT_SOURCE_KEY] = uploadingTo
		}

		if (cb) {
			cb(err, data)
		}
	})

	return passThroughStream
}

function createWriteArrayStream(target, cb, throwError = false) {
	const stringify = JSONStream.stringify()
	const writeStream = createWriteStream(target, cb, throwError)
	stringify.pipe(writeStream)

	Object.defineProperty(
		stringify,
		'writing', { get: () => writeStream.writing }
	)

	return stringify
}

module.exports = {
	createReadStream,
	ArrayWriteableStream,
	finalizeStreams,
	createReadArrayStream,
	createWriteStream,
	createWriteArrayStream,
}
