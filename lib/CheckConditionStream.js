const Stream = require('stream')

module.exports = class CheckStream extends Stream.Transform {
	constructor(caseIndex, expressions, cases = {}) {
		super({ objectMode: true })
		this.total = 0
		this.passed = 0

		this.expressions = expressions
		this.expression = expressions[caseIndex]
		this._case = cases[caseIndex]
		this.cases = cases
	}

	_checkCase($document, expression, _case) {
		if (_case.alwaysRun) {
			return true
		} else {
			try {
				const result = Boolean(expression.call(null, $document))

				if (result) {
					return true
				}
			} catch (e) {
				// skip failed item
			}
		}

		return false
	}

	_transform($document, enc, cb) {
		try {
			this.total++

			let passes = false

			// "default" case acts like "default" case in PL "switch" statement.
			// If $document doesn't satisfy any other case, it goes to default case.
			if (this._case.default) {
				const results = []

				// Go over all other cases and check if $document satisfies any of them
				for (let i = 0; i < this.cases.length; i++) {
					const _case = this.cases[i]

					// Ignore cases with "default" (to avoid infinite recursion)
					// and "alwaysRun" flag
					if (_case.default || _case.alwaysRun) {
						continue
					}

					results.push(this._checkCase($document, this.expressions[i], this.cases[i]))
				}

				// Check if non of the cases returned "true" - meaning that $document
				// should go to default case
				if (!results.some(x => x)) {
					passes = true
				}
			} else {
				passes = this._checkCase($document, this.expression, this._case)
			}

			if (passes) {
				this.push($document)
				this.passed++
			}

			cb()
		} catch (err) {
			cb(err)
		}
	}
}
