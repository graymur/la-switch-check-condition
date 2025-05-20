## Switch check condition AWS lambda function

Given an input of JS objects (read from JSON input, file or S3 link) and a list of cases (similar to a switch statement: graymur/la-switch-check-condition), for each case produces an output with objects that satisfy the case's `expression`.

Everything is done via streams, so the function can handle megabytes of input with small memory consumption.

Given an event:

##### Call example:

```json
{
    "input": [
        {
            "id": 1,
            "lastName": "Doe"
        },
        {
            "id": 2,
            "lastName": "Johnson"
        }
    ],
    "cases": [
        {
            "expression": "x => x.lastName === 'Doe'"
        },
        {
            "default": true
        }
    ],
    "number": 2,
    "logPrefix": "Step 2:",
    "s3": {
        "bucketName": "my-public-S3-bucket",
        "keyPrefix": "resultFolder"
    }
}
```

Function will produce two links to S3. First link will contain JSON, because it satisfies the first case

```json
[
    {
        "id": 1,
        "lastName": "Doe"
    }
]
```

Second will contain this JSON, because this object doesn't satisfy the first case and fall into `default` case:

```json
[
    {
        "id": 2,
        "lastName": "Johnson"
    }
]
```
