# ExpressMicroserviceController

ExpressMicroserviceController is a simple and extensible JavaScript class that may have a datasource injected and provides a REST controller for GET, POST, PUT, and DELETE operations.

Many microservices provide REST interfaces for one facet of an application, often simply a REST interface to a particular collection of records in a database. When the implementations are clones of each other, and may even use the same datasource with a different table or collection, this class provides the implementation without modification.

The class follows the Strategy Pattern and is extensible, so local business logic may be layered on top by creating a subclass.

## Getting Started

### Prerequisites

This JavaScript class is dependent on JavaScript 2017 and async/await. Node 7.6.0 has the V8 5.5 engine, which is the earliest version to support async/await.

### Installing
This is a [Node.js](https://nodejs.org) module available through the [npm registry](https://www.npmjs.com).

Before installing download and install [Nodejs](https://nodejs.org). Node.js 7.6.0 or higher is required.
```
$ npm install express-microservice-controller --save
```
### Using

Require the class and create an instance. Dependencies are injected through the constructor: the port to listen on and the datasource to use. The datasource is an instance of a class implementing an interface with:

* async query(constraints) - returns a list of records, the constraints may be passed directly from express.urlencoded parsing the query string and leaving it in req.params.query.
* async retrieve(id).
* async insert(record) - returns the record with the the primary key updated.
* async update(id, oldRecord, newRecord) - the oldrecord and newRecord must have a primary key that matches id (the key cannot be updated), and will use optimistic concurrency to update the record (only if the oldRecord is an exact match for all fields).
* async delete(id).

All of these methods are asynchronous (or return Promises). If there is any error, it should be thrown (or the Promise rejected).

The reference project example uses an instance of [MongoDatasource](https://github.com/jmussman/mongo-datasource) which implements this interface and connects to a MongoDB database:

```
let MongoDatasource = require('./MongoDatasource');
let ExpressMicroserviceController = require('./ExpressMicroserviceController');

class Server {

    constructor() {

        let collection = process.env.MDBCOLLECTION || 'customers'
        let database = process.env.MDBDATABASE || 'customers'
        let mongodb = process.env.MONGODB || 'mongodb://localhost:27017'
        let port = parseInt(process.env.PORT) || 8080
        
        let datasource = new MongoDatasource(mongodb, database, collection)
        let microservice = new ExpressMicroserviceController(port, datasource)

        microservice.launch()
        console.log(`Service is listening on port ${microservice.port} and connecting to ${mongodb}/${database}/${collection}`)
    }
}

exports = module.exports = new Server()
```

### Extending

See the code for details. The launch method is called to launch the service. This provides an opportunity to use the Strategy Pattern: any of the request processing methods may be overridden: query, retrieve, insert, update, or delete. The may be extended by calling the super-class method before, after, or during the overriding implementation.

The launch method maps the URL patterns to the class methods by calling the method *launchMappings*, so that method may be overridden to replace or modify the maps.

Note that each mapping uses the *wrap* method around the method used for request processing. This is to accomplish two things. One is that the wrap method automatically binds the referenced method to the current controller instance, so that this may be referenced in the method. The second is that the wrap method catches any rejected Promise or exception thrown from an async method, and injects into the Express middleware stack using the *next* function.

## Built With

* ES7

## Contributing

Please read [contributing.md](https://gist.github.com/jmussman/616e291cd7b97f66a3af68298e51c40d) for details on the code of conduct, and the process for submitting pull requests.

## Versioning

[SemVer](http://semver.org/) is used for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 

## Authors

The original author of ExpressMicroserviceController is [Joel Mussman](https://github.com/jmussman)

[List of all contributors](https://github.com/jmussman/express-microservice-controller/contributors)

## License

This project is licensed under the MIT License - see the [License.md](License.md) file for details

## Acknowledgments

Shout-out to Marc Harter whose [2017 article "Asynchronous Error Handling in Express with Promises, Generators and ES7"](https://strongloop.com/strongblog/async-error-handling-expressjs-es7-promises-generators/) at StrongLoop has a great explanation of using a wrapper function to capture Promise rejections and exceptions when async/await is used and feed them into Express middleware. This is a great explanation to review, and understand why I use a similar class method that binds another wrapped method in a class as the callback for Express.