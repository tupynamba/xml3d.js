EPSILON = 0.001;

module("Transformation hierarchy", {
    setup : function() {
        stop();
        var that = this;
        this.cb = function(e) {
            ok(true, "Scene loaded");
            that.doc = document.getElementById("xml3dframe").contentDocument;
            start();
        };
        loadDocument("scenes/basic.xhtml", this.cb);
    },
    teardown : function() {
        var v = document.getElementById("xml3dframe");
        v.removeEventListener("load", this.cb, true);
    }
});

test("Defaults", function() {
    var elems = {};
    elems.group = this.doc.getElementById("myGroup");
    elems.mesh = this.doc.getElementById("myMesh01");
    elems.view = this.doc.getElementById("myView");
    elems.light = this.doc.getElementById("myLight");

    var a = new XML3DMatrix();
    for (elem in elems)
        QUnit.closeMatrix(elems[elem].getWorldMatrix(), a, EPSILON, "Untransformed " + elems[elem].nodeName
                + " delivers indentity world matrix");

    QUnit.closeMatrix(elems.view.getViewMatrix(), a, EPSILON, "Untransformed view matrix");
});

test("View Transformation local", function() {
    var view = this.doc.getElementById("myView");

    var axis = new XML3DVec3(1, 0, 0);
    var m = new XML3DMatrix();
    m = m.translate(0, 0, 10).inverse();
    view.position.z = 10.0;
    QUnit.closeMatrix(view.getViewMatrix(), m, EPSILON, "View translated to 0,0,10.");
    QUnit.close(view.getViewMatrix().m43, -10, EPSILON, "Checked entry in matrix");

    // Turn around
        view.orientation.setAxisAngle(axis, Math.PI / 2);
        m = new XML3DMatrix().translate(0, 0, 10).rotateAxisAngle(1, 0, 0, Math.PI / 2).inverse();
        QUnit.closeMatrix(view.getViewMatrix(), m, EPSILON, "View oriented around x-Axis.");
        QUnit.close(view.getViewMatrix().m42, -10, EPSILON, "Checked entry in matrix");
        QUnit.close(view.getViewMatrix().m23, -1, EPSILON, "Checked entry in matrix");

        view.setAttribute("orientation", "0 1 0 " + Math.PI / 4);
        view.setAttribute("position", "1 2 3");
        m = new XML3DMatrix().translate(1, 2, 3).rotateAxisAngle(0, 1, 0, Math.PI / 4).inverse();
        QUnit.closeMatrix(view.getViewMatrix(), m, EPSILON, "View set with attributes.");
        var halfSqrt = Math.sqrt(0.5);
        QUnit.close(view.getViewMatrix().m11, halfSqrt, EPSILON, "Checked entry in matrix");
        QUnit.close(view.getViewMatrix().m13, halfSqrt, EPSILON, "Checked entry in matrix");
        QUnit.close(view.getViewMatrix().m31, -halfSqrt, EPSILON, "Checked entry in matrix");
        QUnit.close(view.getViewMatrix().m33, halfSqrt, EPSILON, "Checked entry in matrix");
    });

test("Group Transformation local", function() {
    var group = this.doc.getElementById("myGroup");
    group.setAttribute("transform", "#t_identity");
    var a = new XML3DMatrix();
    QUnit.closeMatrix(group.getLocalMatrix(), a, EPSILON, "Group references #t_identity: local Matrix");
    QUnit.closeMatrix(group.getWorldMatrix(), new XML3DMatrix(), EPSILON, "Global transformation is identity");

    a = a.translate(1, 2, 3);
    group.setAttribute("transform", "#t_translation");
    QUnit.closeMatrix(group.getLocalMatrix(), a, EPSILON, "Group references #t_translation: local Matrix");
    QUnit.closeMatrix(group.getWorldMatrix(), new XML3DMatrix(), EPSILON, "Global transformation is identity");

    a = new XML3DMatrix(1, 0, 0, 0, 0, -0, 1, 0, 0, -1, -0, 0, 0, 0, 0, 1);
    group.setAttribute("transform", "#t_rotation");
    QUnit.closeMatrix(group.getLocalMatrix(), a, EPSILON, "Group references #t_rotation: local Matrix");

    a = new XML3DMatrix().scale(1, 2, 3);
    group.setAttribute("transform", "#t_scale");
    QUnit.closeMatrix(group.getLocalMatrix(), a, EPSILON, "Group references #t_scale: local Matrix");

    a = new XML3DMatrix(1, 0, 0, 0, 0, 0, 2, 0, 0, -3, 0, 0, 1, 2, 3, 1);
    group.setAttribute("transform", "#t_mixed");
    QUnit.closeMatrix(group.getLocalMatrix(), a, EPSILON, "Group references #t_mixed: local Matrix");

    });



module("Bounding Boxes", {
    setup : function() {
        stop();
        var that = this;
        this.cb = function(e) {
            ok(true, "Scene loaded");
            that.doc = document.getElementById("xml3dframe").contentDocument;
            start();
        };
        loadDocument("scenes/boundingBox.xhtml", this.cb);
    },
    teardown : function() {
        var v = document.getElementById("xml3dframe");
        v.removeEventListener("load", this.cb, true);
    },
});



test("Groups and Meshes", 8, function() {
    var frontTopMeshBox = this.doc.getElementById("m_TopFront").getBoundingBox();
    var frontBotMeshBox = this.doc.getElementById("m_BotFront").getBoundingBox();
    var emptyBox = this.doc.getElementById("empty_group").getBoundingBox();
    var rootBox = this.doc.getElementById("g_Root").getBoundingBox();
    var topCubeBox = this.doc.getElementById("g_TopCube").getBoundingBox();
    var botCubeBox = this.doc.getElementById("g_BotCube").getBoundingBox();

    ok(emptyBox.isEmpty(), "Empty group delivers empty BoundingBox");

    QUnit.closeBox(frontTopMeshBox, new XML3DBox(new XML3DVec3(-1,-1,0),new XML3DVec3(1,1,0)), EPSILON, "Front rectangle of top cube: (-1 -1 0) to (1 1 0)");
    QUnit.closeBox(frontBotMeshBox, new XML3DBox(new XML3DVec3(-1,-1,0),new XML3DVec3(1,1,0)), EPSILON, "Front rectangle of bottom cube: (-1 -1 0) to (1 1 0)");
    QUnit.closeBox(topCubeBox, new XML3DBox(new XML3DVec3(-1,1.5,-1),new XML3DVec3(1,3.5,1)), EPSILON, "Top cube: (-1 1.5 -1) to (1 3.5 1)");
    QUnit.closeBox(botCubeBox, new XML3DBox(new XML3DVec3(-1,-3.5,-1),new XML3DVec3(1,-1.5,1)), EPSILON, "Bottom cube: (-1 -3.5 -1) to (1 -1.5 1)");
    QUnit.closeBox(rootBox, new XML3DBox(new XML3DVec3(-1,-3.5,-1),new XML3DVec3(1,3.5,1)), EPSILON, "Root group: (-1 -3.5 -1) to (1 3.5 1)");

});
