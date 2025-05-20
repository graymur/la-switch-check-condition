const _ = require('lodash')
const debug = require('debug')('lambdas:switchCheckCondition')
const { finalizeStreams, ArrayWriteableStream, createReadArrayStream, createWriteArrayStream } = require('./lib/utils');
const { PassThrough, finished } = require('stream')
const { promisify } = require('util')
const CheckConditionStream = require('./lib/CheckConditionStream')

const finishedAsync = promisify(finished)

/**
 * Given a single element and expression, execute an expression with element
 * as a parameter and return the result
 *
 * @param {{token:string, input:object}} event
 * @param {object} context
 * @returns {Promise<Object>}
 */
module.exports = async function switchCheckCondition(event, context) {
	debug('event %j', event)

	if (!event.input) {
		throw new Error(`'input' field is required`)
	}

	const readStream = createReadArrayStream(event.input)

	const returnArray = !Boolean(event.s3)

	const getWriteStream = () => {
		if (returnArray) {
			return new ArrayWriteableStream();
		} else if (event.s3) {
			const { bucketName, keyPrefix } = event.s3

			if (!bucketName) {
				throw new TypeError('"s3.bucketName" argument is required')
			}

			if (!keyPrefix) {
				throw new TypeError('"s3.keyPrefix" argument is required')
			}

			const writeStream = createWriteArrayStream({ bucketName, keyPrefix }, (err, data) => {
				if (err) {
					throw err
				} else {
					writeStream.$src = data.$src
				}
			})

			return writeStream
		}
	}

	const getWriteStreamOutput = x => x.$src || x.items

	try {
		let writeStreams = []
		let checkStreams = []
		const promises = []

		// Evaluate string representation of functions into functions
		const expressions = event.cases.map(_case => eval(_case.expression || 'x => x'))

		for (let i = 0; i < event.cases.length; i++) {
			// passThrough stream is needed so that each case checkStream
			// receives full copy of input objects
			const passThrough = new PassThrough({objectMode: true})
			readStream.pipe(passThrough)

			const checkStream = new CheckConditionStream(i, expressions, event.cases)

			checkStreams.push(checkStream)
			passThrough.pipe(checkStream)

			const writeStream = getWriteStream()
			writeStreams.push(writeStream)
			checkStream.pipe(writeStream)

			promises.push(finishedAsync(writeStream))
		}

		// Wait for write streams to process all data
		await Promise.all(promises)

		// Wait for write streams to upload data to S3
		writeStreams = await finalizeStreams(writeStreams)

		const executionSummary = {
			data: writeStreams.map(getWriteStreamOutput)
		}

		debug('execution complete, stats: %j', executionSummary)

		return executionSummary
	} catch (e) {
		console.error(e)
	}
}
