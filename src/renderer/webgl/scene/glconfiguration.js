var ComputeRequest = require("../../../xflow/interface/request.js").ComputeRequest;
var GL = require("../../webgl/constants.js");
var Configuration = require("../../renderer/scene/configuration.js");
var ConfigurableGLStates = require("../render-interface.js").ConfigurableGLStates;

var configurableGLStates = [];
for (var i = 0; i < ConfigurableGLStates.length; i++) {
    configurableGLStates.push("gl-" + ConfigurableGLStates[i]);
}

/**
 * A configuration connects a model (material, light, camera) with a data node containing
 * the parameters for the model
 * The Configuration is immutable
 * The GLConfiguration class also contains gl state entries that are specific to WebGL
 *
 * @param model The model (e.g. identified by an URN)
 * @param {Xflow.DataNode} dataNode  The parameters of this model instance
 * @param {{}} opt
 * @constructor
 */
var GLConfiguration = function(model, dataNode, opt) {
    Configuration.call(this, model, dataNode, opt);

    /**
     * Contains the WebGL state overrides that this material requests.
     * @type {{}}
     */
    this.states = {};

    createStateRequest(this);
};

function createStateRequest(conf) {
    var request = new ComputeRequest(conf.dataNode, configurableGLStates, updateStates.bind(window, conf));
    updateStates(conf, request);
}

function updateStates(conf, request, data) {
    var state = {};
    var result = request.getResult();
    var stateNames = result.outputNames;
    for (var i=0; i < stateNames.length; i++) {
        var name = stateNames[i];
        name = name.substr(3, name.length);
        var vals = result.getOutputData(stateNames[i]).getValue();
        if (vals.length == 1) {
            vals = vals[0].split(" ");
        }
        var parsed = parseGLValues(vals);
        if (parsed) {
            state[name] = parsed;
        } else {
            XML3D.debug.logError("The arguments '"+vals+"' for 'gl-"+name+"' in material '#"+conf.name+"' are not valid.");
        }
    }
    conf.states = state;
}

function parseGLValues(vals) {
    var parsed = [];
    for (var j=0; j<vals.length; j++) {
        var val = vals[j];
        if (GL[val] !== undefined) {
            parsed.push(GL[val]);
        } else if (typeof val == typeof "") {
            if (GL[val.toUpperCase()]) {
                parsed.push(GL[val.toUpperCase()]);
            } else if (val.toLowerCase() == "true") {
                parsed.push(true);
            } else if (val.toLowerCase() == "false") {
                parsed.push(false);
            } else if (!isNaN(+val)) {
                parsed.push(+val);
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    return parsed;
}

module.exports = GLConfiguration;
