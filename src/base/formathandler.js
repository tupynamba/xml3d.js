var AdapterFactory = require("./adapter.js").AdapterFactory;

/**
 * A format handler is provide functionality for detecting format of resources
 * and providing format-specific services.
 * FormatHandlers are registered with XML3D.base.registerFormat() function.
 * @constructor
 */
var FormatHandler = function() {
    this.factoryClasses = {}; // a map from an aspect name to a factory class
    this.factoryCache = {}; // maps unique keys (aspect + "_" + canvasId) to the factory instance
};

FormatHandler.prototype.registerFactoryClass = function (factoryClass) {
    if (!factoryClass.prototype.aspect || !XML3D.isSuperclassOf(AdapterFactory, factoryClass))
        throw new Error("factoryClass must be a subclass of XML3D.base.AdapterFactory");
    this.factoryClasses[factoryClass.prototype.aspect] = factoryClass;
};

FormatHandler.prototype.getFactoryClassByAspect = function (aspect) {
    return this.factoryClasses[aspect];
};

FormatHandler.prototype.getFactory = function (aspect, canvasId) {
    canvasId = canvasId || 0;
    var key = aspect + "_" + canvasId;
    var factory = this.factoryCache[key];
    if (!factory) {
        var factoryClass = this.getFactoryClassByAspect(aspect);
        if (!factoryClass)
            return null;
        factory = new factoryClass(canvasId);
        this.factoryCache[key] = factory;
    }
    return factory;
};

//noinspection JSUnusedLocalSymbols
/**
 * Returns true if response data format is supported.
 * response, responseType, and mimetype values are returned by XMLHttpRequest.
 * Data type of the response is one of ArrayBuffer, Blob, Document, String, Object.
 * responseType is one of "", "arraybuffer", "blob", "document", "json", "text"
 *
 * @override
 * @param {Object} response
 * @param {string} responseType
 * @param {string} mimetype
 * @return {Boolean}
 */
FormatHandler.prototype.isFormatSupported = function (response, responseType, mimetype) {
    return false;
};

/**
 * Converts response data to format data.
 * Default implementation returns value of response.
 *
 * @override
 * @param {Object} response
 * @param {string} responseType
 * @param {string} mimetype
 * @param {function} callback
 * @return {Object}
 */
FormatHandler.prototype.getFormatData = function (response, responseType, mimetype, callback) {
    callback(true, response);
};

/**
 * Extracts data for a fragment from document data and fragment reference.
 *
 * @override
 * @param {Object} documentData
 * @param {string} fragment Fragment without pound key which defines the part of the document
 * @return {*}
 */
FormatHandler.prototype.getFragmentData = function (documentData, fragment) {
    if (!fragment)
        return documentData;
    return null;
};

/**
 * XMLFormatHandler supports all XML and HTML-based documents.
 * @constructor
 * @extends FormatHandler
 */
var XMLFormatHandler = function () {
    FormatHandler.call(this);
};
XML3D.createClass(XMLFormatHandler, FormatHandler);

XMLFormatHandler.prototype.isFormatSupported = function (response, responseType, mimetype) {
    return response && response.nodeType === 9 && (mimetype === "application/xml" || mimetype === "text/xml");
};

XMLFormatHandler.prototype.getFormatData = function (response, responseType, mimetype, callback) {
    callback(true, response);
};

XMLFormatHandler.prototype.getFragmentData = function (documentData, fragment) {
    return documentData.querySelectorAll("*[id='" + fragment + "']")[0];
};


/**
 *
 * @constructor
 * @extends FormatHandler
 */
var XML3DFormatHandler = function () {
    XMLFormatHandler.call(this);
};
XML3D.createClass(XML3DFormatHandler, XMLFormatHandler);

XML3DFormatHandler.prototype.isFormatSupported = function (response, responseType, mimetype) {
    // FIXME add check by searching for 'xml3d' tags in the document
    return XMLFormatHandler.prototype.isFormatSupported.call(this, response, responseType, mimetype);
};

XML3DFormatHandler.prototype.getFormatData = function (response, responseType, mimetype, callback) {
    // Configure all xml3d elements:
    var xml3dElements = response.querySelectorAll("xml3d");
    for (var i = 0; i < xml3dElements.length; ++i) {
        XML3D.config.element(xml3dElements[i]);
    }
    callback(true, response);
};

/**
 * @constructor
 * @extends FormatHandler
 */
var JSONFormatHandler = function () {
    FormatHandler.call(this);
};
XML3D.createClass(JSONFormatHandler, FormatHandler);

JSONFormatHandler.prototype.isFormatSupported = function (response, responseType, mimetype) {
    return mimetype === "application/json";
};

/**
 * @constructor
 * @extends FormatHandler
 */
var BinaryFormatHandler = function () {
    FormatHandler.call(this);
};
XML3D.createClass(BinaryFormatHandler, FormatHandler);

module.exports = {
    JSONFormatHandler: JSONFormatHandler,
    BinaryFormatHandler: BinaryFormatHandler,
    XMLFormatHandler: XMLFormatHandler,
    XML3DFormatHandler: XML3DFormatHandler,
    FormatHandler: FormatHandler
};