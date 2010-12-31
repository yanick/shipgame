/**
 *  Raphaël-ZPD: A zoom/pan/drag plugin for Raphaël.
 * ==================================================
 *
 * This code is licensed under the following BSD license:
 * 
 * Copyright 2010 Gabriel Zabusek <gabriel.zabusek@gmail.com> (Interface and feature extensions and modifications). All rights reserved.
 * Copyright 2010 Daniel Assange <somnidea@lemma.org> (Raphaël integration and extensions). All rights reserved.
 * Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com> (original author). All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Andrea Leofreddi.
 */

var raphaelZPDId = 0;

RaphaelZPD = function(raphaelPaper, o) {
    
    // self pointer
    var ptr = this;

	this.initialized = false;
	this.opts = { zoom: true, pan: true, drag: true };
    this.root = null;
    this.id   = ++raphaelZPDId;

    this.root = raphaelPaper.canvas;

    // Construct the object
    this.gelem = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	this.gelem.id = 'viewport'+this.id;
	this.root.appendChild(this.gelem);
	raphaelPaper.canvas = this.gelem;

    this.state = 'none'; 
    this.stateTarget = null;
    this.stateOrigin = null;
    this.stateTf = null;
    this.zoomLimit = 0;
    this.zoomCurrent = 0;

    if (o) {
		for (key in o) {
			if (this.opts[key] != undefined) {
				this.opts[key] = o[key];
			}
		}
	}

    /**
    * Set the maximum amount of zoom mousewheel scrolls
    */
    this.setZoomLimit = function(limit) {
        this.zoomLimit = limit;
    }

	/**
	 * Handler registration
	 */
	this.setupHandlers = function(root) {
		this.root.onmousedown = this.handleMouseDown;
		this.root.onmousemove = this.handleMouseMove;
		this.root.onmouseup   = this.handleMouseUp;


		//this.root.onmouseout = this.handleMouseUp; // Decomment this to stop the pan functionality when dragging out of the SVG element

		if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0)
			this.root.addEventListener('mousewheel', this.handleMouseWheel, false); // Chrome/Safari
		else
			this.root.addEventListener('DOMMouseScroll', this.handleMouseWheel, false); // Others
	}

	/**
	 * Instance an SVGPoint object with given event coordinates.
	 */
	this.getEventPoint = function(evt) {
		var p = this.root.createSVGPoint();

		p.x = evt.clientX;
		p.y = evt.clientY;

		return p;
	}

	/**
	 * Sets the current transform matrix of an element.
	 */
	this.setCTM = function(element, matrix) {
		var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

		element.setAttribute("transform", s);
	}

	/**
	 * Dumps a matrix to a string (useful for debug).
	 */
	this.dumpMatrix = function(matrix) {
		var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";

		return s;
	}

	/**
	 * Sets attributes of an element.
	 */
	this.setAttributes = function(element, attributes) {
		for (i in attributes)
			element.setAttributeNS(null, i, attributes[i]);
	}

	/**
	 * Handle mouse move event.
	 */
	this.handleMouseWheel = function(evt) {
		if (!ptr.opts.zoom) return;

		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var delta;

		if (evt.wheelDelta)
			delta = evt.wheelDelta / 3600; // Chrome/Safari
		else
			delta = evt.detail / -90; // Mozilla

        if (delta > 0) {
            if (ptr.zoomLimit) 
                if (ptr.zoomLimit <= ptr.zoomCurrent)  return;
            ptr.zoomCurrent++;
        } else {
            if (ptr.zoomLimit)
                if (-ptr.zoomLimit >= ptr.zoomCurrent) return;
            ptr.zoomCurrent--;
        }

		var z = 1 + delta; // Zoom factor: 0.9/1.1

		var g = svgDoc.getElementById("viewport"+ptr.id);
		
		var p = ptr.getEventPoint(evt);

		p = p.matrixTransform(g.getCTM().inverse());

		// Compute new scale matrix in current mouse position
		var k = ptr.root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);
		ptr.setCTM(g, g.getCTM().multiply(k));

		if (!ptr.stateTf)
			ptr.stateTf = g.getCTM().inverse();

		ptr.stateTf = ptr.stateTf.multiply(k.inverse());
	}

	/**
	 * Handle mouse move event.
	 */
	this.handleMouseMove = function(evt) {
		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var g = svgDoc.getElementById("viewport"+ptr.id);

		if (ptr.state == 'pan') {
			// Pan mode
			if (!ptr.opts.pan) return;

			var p = ptr.getEventPoint(evt).matrixTransform(ptr.stateTf);

			ptr.setCTM(g, ptr.stateTf.inverse().translate(p.x - ptr.stateOrigin.x, p.y - ptr.stateOrigin.y));
		} else if (ptr.state == 'move') {
			// Move mode
			if (!ptr.opts.drag) return;

			var p = ptr.getEventPoint(evt).matrixTransform(g.getCTM().inverse());

			ptr.setCTM(ptr.stateTarget, ptr.root.createSVGMatrix().translate(p.x - ptr.stateOrigin.x, p.y - ptr.stateOrigin.y).multiply(g.getCTM().inverse()).multiply(ptr.stateTarget.getCTM()));

			ptr.stateOrigin = p;
		}
	}

	/**
	 * Handle click event.
	 */
	this.handleMouseDown = function(evt) {
		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var g = svgDoc.getElementById("viewport"+ptr.id);

		if (evt.target.tagName == "svg" || !ptr.opts.drag) {
			// Pan mode
			if (!ptr.opts.pan) return;

			ptr.state = 'pan';

			ptr.stateTf = g.getCTM().inverse();

			ptr.stateOrigin = ptr.getEventPoint(evt).matrixTransform(ptr.stateTf);
		} else {
			// Move mode
			if (!ptr.opts.drag || evt.target.draggable == false) return;

			ptr.state = 'move';

			ptr.stateTarget = evt.target;

			ptr.stateTf = g.getCTM().inverse();

			ptr.stateOrigin = ptr.getEventPoint(evt).matrixTransform(ptr.stateTf);
		}
	}

	/**
	 * Handle mouse button release event.
	 */
	this.handleMouseUp = function(evt) {
		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		if ((ptr.state == 'pan' && ptr.opts.pan) || (ptr.state == 'move' && ptr.opts.drag)) {
			// Quit pan mode
			ptr.state = '';
		}
	}


    // end of constructor
  	ptr.setupHandlers(this.root);
	this.initialized = true;
}

Raphael.fn.ZPDPanTo = function(x, y) {
	if (this.canvas.getCTM() == null) {
		alert('failed');
		return null;
	}

	var stateTf = this.canvas.getCTM().inverse();

	var svg = document.getElementsByTagName("svg")[0];

	if (!svg.createSVGPoint) alert("no svg");        

	var p = svg.createSVGPoint();

	p.x = x; 
	p.y = y;

	p = p.matrixTransform(stateTf);

	var element = this.canvas;
	var matrix = stateTf.inverse().translate(p.x, p.y);

	var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

	element.setAttribute("transform", s);

	return this;   
}

