const assert = require('chai').assert
const context = require('../mocks/context')
const { switchCheckCondition } = require('../../src/index')

describe('Works as switch', function () {
    it('Applies expressions', async () => {
        const event = {
            input: [
                {
                    id: 1,
                    lastName: 'Doe'
                },
                {
                    id: 2,
                    lastName: 'Johnson'
                }
            ],
            cases: [
                {
                    expression: "x => x.lastName === 'Doe'",
                },
                {
                    expression: "x => x.lastName === 'Johnson'",
                },
            ],
            returnArray: true,
        }

        const result = await switchCheckCondition(event, context)

        assert.deepEqual(result.data, [
                [
                    {
                        id: 1,
                        lastName: 'Doe',
                    },
                ],
                [
                    {
                        id: 2,
                        lastName: 'Johnson',
                    },
                ]
            ]
        )
    })

    it('Reads input from file', async () => {
        const event = {
            input: __dirname + '/input.json',
            cases: [
                {
                    expression: "x => x.lastName === 'Doe'",
                },
                {
                    expression: "x => x.lastName === 'Johnson'",
                },
            ],
            returnArray: true,
        }

        const result = await switchCheckCondition(event, context)

        assert.deepEqual(result.data, [
                [
                    {
                        id: 1,
                        lastName: 'Doe',
                    },
                ],
                [
                    {
                        id: 2,
                        lastName: 'Johnson',
                    },
                ]
            ]
        )
    })

    it('Applies expressions and uses alwaysRun', async () => {
        const event = {
            input: [
                {
                    id: 1,
                    lastName: 'Doe'
                },
                {
                    id: 2,
                    lastName: 'Johnson'
                }
            ],
            cases: [
                {
                    expression: "x => x.lastName === 'Doe'",
                },
                {
                    alwaysRun: true,
                },
            ],
            returnArray: true,
        }

        const result = await switchCheckCondition(event, context)

        assert.deepEqual(result.data, [
                [
                    {
                        id: 1,
                        lastName: 'Doe',
                    },
                ],
                [
                    {
                        id: 1,
                        lastName: 'Doe',
                    },
                    {
                        id: 2,
                        lastName: 'Johnson',
                    },
                ]
            ]
        )
    })

    it('Supports "default" option', async () => {
        const event = {
            input: [
                {
                    id: 1,
                    lastName: 'Doe'
                },
                {
                    id: 2,
                    lastName: 'Johnson'
                },
                {
                    id: 3,
                    lastName: 'Jones'
                },
            ],
            cases: [
                {
                    expression: "x => x.lastName === 'Doe'",
                },
                {
                    expression: "x => x.lastName === 'Johnson'",
                },
                {
                    default: true,
                },
            ],
            returnArray: true,
        }

        const result = await switchCheckCondition(event, context)

        assert.deepEqual(result.data, [
                [
                    {
                        id: 1,
                        lastName: 'Doe',
                    },
                ],
                [
                    {
                        id: 2,
                        lastName: 'Johnson',
                    },
                ],
                [
                    {
                        id: 3,
                        lastName: 'Jones',
                    },
                ],
            ]
        )
    })
})
