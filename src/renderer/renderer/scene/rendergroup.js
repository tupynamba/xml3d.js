var RenderNode = require("./rendernode.js");
var Constants = require("./constants.js");
var Frustum = require("../tools/frustum.js").Frustum;

var NODE_TYPE = Constants.NODE_TYPE;
var EVENT_TYPE = Constants.EVENT_TYPE;

/** @const */
var WORLD_MATRIX_OFFSET = 0;
/** @const */
var LOCAL_MATRIX_OFFSET = WORLD_MATRIX_OFFSET + 16;
/** @const */
var WORLD_BB_OFFSET = LOCAL_MATRIX_OFFSET + 16;
/** @const */
var ENTRY_SIZE = WORLD_BB_OFFSET + 6;


   /** @const */
    var CLIPPLANE_NEAR_MIN = 0.01;

    /** @const */
    var DEFAULT_FIELDOFVIEW = 45 / 180 * Math.PI;
/**
 *
 * @constructor
 * @extends {RenderNode}
 */
var RenderGroup = function (scene, pageEntry, opt) {
    RenderNode.call(this, NODE_TYPE.GROUP, scene, pageEntry, opt);
    opt = opt || {};

    /**
     * The material attached to this group
     * @type {MaterialConfiguration|null}
     */
    this._material = opt.material || null;
    this.boundingBoxDirty = false;
    this.projectionDirty = true;
    this.setWorldSpaceBoundingBox(XML3D.math.bbox.EMPTY_BOX);

    // Camera related
    this.fieldOfView = opt.fieldOfView !== undefined ? opt.fieldOfView : DEFAULT_FIELDOFVIEW;
    this.worldSpacePosition = XML3D.math.vec3.create();
    this.projectionOverride = opt.projectionOverride;
    this.viewDirty = true;
    this.projectionDirty = true;
    this.frustum = new Frustum(1, 100000, 0, this.fieldOfView, 1);
    this.lastAspectRatio = 1;
    this.projectionMatrix = XML3D.math.mat4.create();
};
RenderGroup.ENTRY_SIZE = ENTRY_SIZE;

XML3D.createClass(RenderGroup, RenderNode);

XML3D.extend(RenderGroup.prototype, {
    getLocalMatrix: function (dest) {
        var o = this.offset + LOCAL_MATRIX_OFFSET;
        for (var i = 0; i < 16; i++, o++) {
            dest[i] = this.page[o];
        }
    },

    setLocalMatrix: function (source) {
        var o = this.offset + LOCAL_MATRIX_OFFSET;
        for (var i = 0; i < 16; i++, o++) {
            this.page[o] = source[i];
        }
        this.setTransformDirty();
        this.setBoundingBoxDirty();
    },

    getWorldSpaceBoundingBox: function (bbox) {
        if (this.boundingBoxDirty) {
            this.updateWorldSpaceBoundingBox();
        }
        var o = this.offset + WORLD_BB_OFFSET;
        bbox.data[0] = this.page[o];
        bbox.data[1] = this.page[o + 1];
        bbox.data[2] = this.page[o + 2];
        bbox.data[3] = this.page[o + 3];
        bbox.data[4] = this.page[o + 4];
        bbox.data[5] = this.page[o + 5];
    },

    setWorldSpaceBoundingBox: function (bbox) {
        var o = this.offset + WORLD_BB_OFFSET;
        this.page[o] = bbox.data[0];
        this.page[o + 1] = bbox.data[1];
        this.page[o + 2] = bbox.data[2];
        this.page[o + 3] = bbox.data[3];
        this.page[o + 4] = bbox.data[4];
        this.page[o + 5] = bbox.data[5];
    },


    updateWorldSpaceBoundingBox: (function () {
        var childBB = new XML3D.Box();

        return function () {
            var localBB = new XML3D.Box();

            for (var i = 0, j = this.children.length; i < j; i++) {
                var obj = this.children[i];
                obj.getWorldSpaceBoundingBox(childBB);
                localBB.extend(childBB);
            }
            this.setWorldSpaceBoundingBox(localBB);
            this.boundingBoxDirty = false;
        }
    })(),

    addChild: function (child) {
        this.children.push(child);
        this.setBoundingBoxDirty();
        this.scene.emit(EVENT_TYPE.SCENE_STRUCTURE_CHANGED, child, false);
    },

    removeChild: function (child) {
        var index = this.children.indexOf(child);
        if (index != -1) {
            this.children.splice(index, 1);
        }
        this.scene.emit(EVENT_TYPE.SCENE_STRUCTURE_CHANGED, child, true);
    },

    getChildren: function () {
        return this.children;
    },

    updateWorldMatrix: function (sourceMat4) {
        var page = this.page;
        var offset = this.offset;
        XML3D.math.mat4.multiplyOffset(page, offset + WORLD_MATRIX_OFFSET, page, offset + LOCAL_MATRIX_OFFSET, sourceMat4, 0);
        this.transformDirty = false;
    },

    setTransformDirty: function () {
        if (this.transformDirty) {
            //We can be sure all child nodes are already set to transformDirty from here
            return;
        }
        this.transformDirty = true;
        var children = this.children;
        for(var i = 0, l = children.length; i < l; i++) {
            children[i].setTransformDirty();
        }
    },

    /**
     * @param {MaterialConfiguration|null} material
     */
    setMaterial: function (material) {
        if(this._material === material)
            return;
        this._material = material;
        this.children.forEach(function (obj) {
            obj.parentMaterialChanged && obj.parentMaterialChanged();
        });
    },

    parentMaterialChanged: function () {
        if (this._material) {
            // Local material overrides anything coming from upstream
            return;
        }
        this.children.forEach(function (obj) {
            obj.parentMaterialChanged && obj.parentMaterialChanged();
        });
    },

    /**
     * @returns {MaterialConfiguration}
     */
    getMaterial: function () {
        return this._material || this.parent.getMaterial();
    },

    /**
     * A group propagates its visibility
     */
    visibilityChanged: function () {
        var children = this.children;
        for (var i = 0, l = children.length; i < l; i++) {
            children[i].evaluateVisibility();
        }
    },



    setBoundingBoxDirty: function () {
        this.boundingBoxDirty = true;
        if (this.parent) {
            this.parent.setBoundingBoxDirty();
        }
    },

    findRayIntersections: (function () {
        var bbox = new XML3D.Box();

        return function (ray, intersections) {
            this.getWorldSpaceBoundingBox(bbox);
            if (ray.intersects(bbox)) {
                for (var i = 0; i < this.children.length; i++) {
                    this.children[i].findRayIntersections(ray, intersections);
                }
            }
        }
    })(),



    // Camera related stuff
    getWorldToViewMatrix: function(dest) {
        this.getWorldMatrix(dest);
        XML3D.math.mat4.invert(dest, dest);
    },


    setProjectionOverride: function (projAdapter) {
        this.projectionOverride = projAdapter;
        this.setProjectionDirty();
        this.scene.requestRedraw("Projection changed");
    },


    setProjectionDirty: function () {
        this.projectionDirty = true;
    },

    getProjectionMatrix: function (dest, aspect) {
        if (this.projectionDirty || aspect != this.lastAspectRatio) {
            this.updateProjectionMatrix(aspect);
        }
        XML3D.math.mat4.copy(dest, this.projectionMatrix);
    },

    setProjectionMatrix: function (value) {
        XML3D.math.mat4.copy(this.projectionMatrix, value);
    },

    getViewToWorldMatrix: function(dest) {
        this.getWorldMatrix(dest);
    },

    getFrustum: function() {
        return new Frustum();

    },
 getWorldSpacePosition: function() {
            return XML3D.math.vec3.create();

        },

    updateProjectionMatrix: (function() {
            var tmp = XML3D.math.mat4.create();

            return function(aspect) {
                if (this.projectionOverride) {
                    this.setProjectionMatrix(this.projectionOverride);
                    // TODO: Correctly compute frustrum from projection matrix (if possible)
                    this.frustum.setFrustum(1, 100000, 0, this.fieldOfView, 1);
                    return;
                }

                var clipPlane = this.getClippingPlanes(),
                    near = clipPlane.near,
                    far = clipPlane.far,
                    fovy = this.fieldOfView;

                // Calculate perspective projectionMatrix
                XML3D.math.mat4.perspective(tmp, fovy, aspect, near, far);
                // Set projectionMatrix
                this.setProjectionMatrix(tmp);
                // Update Frustum
                this.frustum.setFrustum(near, far, 0, fovy, aspect);

                this.lastAspectRatio = aspect;
            }
        })(),

        getClippingPlanes: (function() {
            var t_mat = XML3D.math.mat4.create();
            var bb = new XML3D.math.bbox.create();

            return function() {
                this.scene.getBoundingBox(bb);
                if (XML3D.math.bbox.isEmpty(bb)) {
                    return { near: 1, far: 10 };
                }
                this.getWorldToViewMatrix(t_mat);
                XML3D.math.bbox.transformAxisAligned(bb, t_mat, bb);

                var near = -bb[5],
                    far = -bb[2],
                    expand = Math.max((far - near) * 0.005, 0.05);

                // Expand the view frustum a bit to ensure 2D objects parallel to the camera are rendered
                far += expand;
                near -= expand;

                return {near: Math.max(near, expand, CLIPPLANE_NEAR_MIN), far: far};
            }
        })()

});

// Export
module.exports = RenderGroup;

