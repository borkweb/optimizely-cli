var Promise = require("bluebird");
var rest = require('restler');
var _ = require('lodash');

var methodNamesToPromisify = "get post put del head patch json postJson putJson".split(" ");

function EventEmitterPromisifier(originalMethod) {
  // return a function
  return function promisified() {
    var args = [].slice.call(arguments);
    // Needed so that the original method can be called with the correct receiver
    var self = this;
    // which returns a promise
    return new Promise(function(resolve, reject) {
      // We call the originalMethod here because if it throws,
      // it will reject the returned promise with the thrown error
      var emitter = originalMethod.apply(self, args);

      emitter
      .on("success", function(data, response) {
        resolve([data, response]);
      })
      .on("fail", function(data, response) {
        // Erroneous response like 400
        reject({message: data.toString()});
        // resolve([data, response]);
      })
      .on("error", function(err) {
        reject(err);
      })
      .on("abort", function() {
        reject(new Promise.CancellationError());
      })
      .on("timeout", function() {
        reject(new Promise.TimeoutError());
      });
    });
  };
};

Promise.promisifyAll(rest, {
  filter: function(name) {
    return methodNamesToPromisify.indexOf(name) > -1;
  },
  promisifier: EventEmitterPromisifier
});

function OptimizelyClient(apiToken) {
  //initialize
  this.apiToken = apiToken;
  this.baseUrl = 'https://www.optimizelyapis.com/experiment/v1/';
}

OptimizelyClient.prototype.getExperiments = function(project_id) {
  var theUrl = this.baseUrl + 'projects/' + project_id + '/experiments/';
  return rest.getAsync(theUrl, {
    method: 'get',
    headers: {'Token': this.apiToken, 'Content-Type': 'application/json'}
  });
}

OptimizelyClient.prototype.getExperimentByDescription = function(project_id, description) {
  return this.getExperiments(project_id).spread(function(data, response) {
    return _.find(data, function(experiment) {
      return experiment['description'] === description;
    });
  })
}

OptimizelyClient.prototype.createExperiment = function(args) {
  var postUrl = this.baseUrl + 'projects/' + args['project_id'].toString() + '/experiments/';
  return rest.postAsync(postUrl, {
    method: 'post',
    headers: {'Token': this.apiToken, 'Content-Type': 'application/json'},
    data: JSON.stringify({'edit_url': args['edit_url'], 
                          'description': args['description'],
                          'url_conditions': args['url_conditions']
                          })
  });
}

OptimizelyClient.prototype.updateVariation = function(variationId, args) {
  var putUrl = this.baseUrl + 'variations/' + variationId.toString();
  return rest.putAsync(putUrl, {
    method: 'put',
    headers: {'Token': this.apiToken, 'Content-Type': 'application/json'},
    data: JSON.stringify({'js_component': args['js_component'], 'description': args['description']})
  });
}

OptimizelyClient.prototype.createVariation = function(args) {
  var postUrl = this.baseUrl + 'experiments/' + args['experimentId'].toString() + '/variations/';
  return rest.postAsync(postUrl, {
    method: 'post',
    headers: {'Token': this.apiToken, 'Content-Type': 'application/json'},
    data: JSON.stringify({'description': args['description']})
  });
}


module.exports = OptimizelyClient;