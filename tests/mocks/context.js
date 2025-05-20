// AWS Lambda context mock
module.exports = {
	succeed: data => data,
	fail: err => {
		throw err
	},
	functionVersion: 'TEST'
};
