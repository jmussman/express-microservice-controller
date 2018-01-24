// ExpressMicroserviceController.js
//
// Copyright © 2018 Joel A. Mussman. All rights reserved.
//
// This software is released under the MIT license.
//
// A base class for Express-based microservices that provides the common collection features
// of get (query one or more), get (retrieve a specific record), post (insert), put (update),
// and delete. The respond method performs a basic JSON response to the HTTP request, and the
// wrap method is used to wrap the Express callbacks and translate promise rejections and
// thrown errors into "next" method calls for Express to trap them in middleware.
//
// All of these methods are exposed so that they may be overridden in a subclass. If they
// are overridden in the subclass, then the Strategy Pattern is being followed, and the overridden
// methods will be invoked when the launch method of the superclass is called.
//
// The class expects a port and datasource to be injected through the constructor during
// instantiation. The datasource is an object that the controller methods will delegate to.
// The datasource must have a query method that takes constraints, a retreive method that takes
// a record id, a post method that takes a new record, a put method that takes an old and new
// record and uses optimistic concurrency during writes, and a delete method that takes an
// id. 
//

class ExpressMicroserviceController {

    constructor(port, datasource) {

        this.port = port
        this.datasource = datasource

        this.express = require('express')
        this.app = this.express()
    }

    get app() {

        return this._app
    }

    set app(value) {

        this._app = value
    }

    get datasource() {

        return this._datasource
    }

    set datasource(value) {

        this._datasource = value
    }

    get express() {

        return this._express
    }

    set express(value) {
        
        this._express = value
    }

    get port() {

        return this._port
    }

    set port(value) {

        // This allows dynamic port changes; the old port is closed and the new port
        // is opened. This is not expected to be a frequent occurence, and there could
        // be a race condition that we are not going to spend time isolating if a
        // request is being processed when this happens.

        let oldPort = this.port

        this._port = value

        if (oldPort && this.server) {

            this.server.close()
            this.server.listen(this.port)
        }
    }

    get server() {

        return this._server
    }

    set server(value) {

        this._server = value
    }

    // error
    // This method is used to trap errors bubbling in the Express framework and turn them
    // into 404 messages for the client.
    //

    error(err, req, res, next) {

        console.log('Express trapped error:', err.message)
        console.log(err)

        res.writeHeader(404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' })
        res.write('Not found.')
        res.end()
    }  

    // delete
    // Remove a record from the datasource.
    //

    async delete(req, res) {

        await customerData.deleteCustomer(req.params.id)
        this.respond(res, null)
    }

    launch() {

        // The express.json() middleware parser is used first to extract any JSON paylod to req.body.

        this.app.use(this.express.urlencoded({ extended: false }));  
        this.app.use(this.express.json({ strict: false }));

        // Call the launchMappings method which may be extended.

        this.launchMappings()

        // Add error handling at the top, respond with a 404.

        this.app.use(this.error.bind(this))

        // Launch the service; the http server is used to allow for port changes while
        // the microservice is running, see the setter for the port property.

        this.server = require('http').Server(this.app)
        this.server.listen(this.port)
    }

    launchMappings() {

        // There is not a performance advantage when using the class methods; a closure would only be created once for
        // the controller anyway. Using methods (and binding them to the singleton) is just because it is OOP, and
        // makes the mappings easier to read without scanning over the closures.

        this.app.get('/', this.wrap(this.query))
        this.app.get('/:id', this.wrap(this.retrieve))
        this.app.post('/', this.wrap(this.insert))
        this.app.put('/:id', this.wrap(this.update))
        this.app.delete('/:id', this.wrap(this.delete))
    }

    // _insert
    // Insert a new record into the datasource. The original record should be returned with the
    // new primary key added.
    //

    async insert(req, res) {

        let results = await this.datasource.insert(req.body)

        this.respond(res, results)
    }

    // query
    // Query the datasource for one or more records. The query string name=value pairs are passed
    // to the data source to control the query, it has the responsibility of translating them into
    // the language of the persistence layer.
    //

    async query(req, res) {

        let results = await this.datasource.query(req.query)

        this.respond(res, results)
    }

    // respond
    // This method formats any data and writes it to the response.
    //

    respond(res, data) {

        res.writeHeader(200, 'OK', { 'Content-Type': 'application/json' })

        if (data) {

            res.write(JSON.stringify(data))
        }

        res.end()
    }

    // retrieve
    // Retrieve a specific record from the datasource by id. The id will arrive as REST data
    // in the URL.
    //

    async retrieve(req, res) {

        if (req.params.id === 'favicon.ico') {

            // Strip favicon.ico, this only happens if someone is using a browser to query the service,
            // and we are not interested.

            res.writeHeader(404, 'File not found')
            res.end()
        
        } else {
                
            let results = await this.datasource.retrieve(req.params.id)

            this.respond(res, results)
        }
    }

    // update
    // Update an existing record. The source should be an array with two records, the original record
    // and the updated record (the new record). The entity framework is expected to use optimistic
    // concurrency; if the original record cannot be located property for property, then the update
    // cannot take place.
    //

    async update(req, res) {

        await this.datasource.update(req.parse.id, req.body[0], req.body[1])

        this.respond(res, null)
    }

    // wrap
    // This function is used to wrap the asynchronous methods and catch any rejections or exceptions
    // bubbling up through the promise chain. Any error or exception is passed into the next handler
    // for the Express middleware, so eventually it will be trapped and dealt with. wrap also takes
    // care of binding the function passed in to the current object.
    //

    wrap(fn) {

        return (req, res, next) => (fn.bind(this))(req, res, next).catch(next)
    }
}

exports = module.exports = ExpressMicroserviceController