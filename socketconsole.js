/*
    Adapted From:
    -------------
	blackbirdjs.googlecode.com
	Author: G Scott Olson
	MIT License
*/
function TimeSeries(options) {
  options = options || {};
  options.resetBoundsInterval = options.resetBoundsInterval || 3000; // Reset the max/min bounds after this many milliseconds
  options.resetBounds = options.resetBounds || true; // Enable or disable the resetBounds timer
  this.options = options;
  this.data = [];
  
  this.maxValue = Number.NaN; // The maximum value ever seen in this time series.
  this.minValue = Number.NaN; // The minimum value ever seen in this time series.

  // Start a resetBounds Interval timer desired
  if (options.resetBounds) {
    this.boundsTimer = setInterval(function(thisObj) { thisObj.resetBounds(); }, options.resetBoundsInterval, this);
  }
}

// Reset the min and max for this timeseries so the graph rescales itself
TimeSeries.prototype.resetBounds = function() {
  this.maxValue = Number.NaN;
  this.minValue = Number.NaN;
  for (var i = 0; i < this.data.length; i++) {
    this.maxValue = !isNaN(this.maxValue) ? Math.max(this.maxValue, this.data[i][1]) : this.data[i][1];
    this.minValue = !isNaN(this.minValue) ? Math.min(this.minValue, this.data[i][1]) : this.data[i][1];
  }
};

TimeSeries.prototype.append = function(timestamp, value) {
  this.data.push([timestamp, value]);
  this.maxValue = !isNaN(this.maxValue) ? Math.max(this.maxValue, value) : value;
  this.minValue = !isNaN(this.minValue) ? Math.min(this.minValue, value) : value;
};

( function() {
	var NAMESPACE = 'log';
	var IE6_POSITION_FIXED = true; // enable IE6 {position:fixed}
	
	var bbird;
	var outputList;
	var cache = [];
    var count = 0;
    var hidden = true;
    var time_data = new TimeSeries();

	
	var state = getState();
	var classes = {};
	var profiler = {};
	var IDs = {
		blackbird: 'blackbird',
		checkbox: 'bbVis',
		filters: 'bbFilters',
		controls: 'bbControls',
		size: 'bbSize'
	}
	var messageTypes = { //order of these properties imply render order of filter controls
		debug: true,
		info: true,
		warn: true,
		error: true,
		profile: true
	};

    setInterval(function() {
      if (!hidden) {
          time_data.append(new Date().getTime(), count);
          count = 0;
      }
    }, 1000);
	
	function generateMarkup() { //build markup
		var spans = [];
		for ( type in messageTypes ) {
			spans.push( [ '<span class="bb-', type, '" type="', type, '"></span>'].join( '' ) );
		}

		var newNode = document.createElement( 'div' );
		newNode.id = IDs.blackbird;
		newNode.style.display = 'none';
		newNode.innerHTML = [
			'<div class="bb-header">',
				'<div class="bb-left">',
					'<div id="', IDs.filters, '" title="click to filter by message type">', spans.join( '' ), '</div>',
				'</div>',
				'<div class="bb-right">',
					'<div id="', IDs.controls, '">',
						'<span id="', IDs.size ,'" op="resize"></span>',
						'<span class="bb-clear" title="clear" op="clear"></span>',
						'<span class="bb-close" title="close" op="close"></span>',
					'</div>',
				'</div>',
			'</div>',
			'<div class="bb-main">',
                '<canvas id="timeseries" height="100"></canvas>',
				'<div class="bb-left"></div><div class="bb-mainBody">',
					'<ol>', cache.join( '' ), '</ol>',
				'</div><div class="bb-right"></div>',
			'</div>',
			'<div class="bb-footer">',
				'<div class="bb-left" id="', IDs.checkbox, '"><span></span>Visible on page load</div>',
				'<div class="bb-right"></div>',
			'</div>'
		].join( '' );
		return newNode;
	}

	function backgroundImage() { //(IE6 only) change <BODY> tag's background to resolve {position:fixed} support
		var bodyTag = document.getElementsByTagName( 'BODY' )[ 0 ];
		
		if ( bodyTag.currentStyle && IE6_POSITION_FIXED ) {
			if (bodyTag.currentStyle.backgroundImage == 'none' ) {
				bodyTag.style.backgroundImage = 'url(about:blank)';
			}
			if (bodyTag.currentStyle.backgroundAttachment == 'scroll' ) {
				bodyTag.style.backgroundAttachment = 'fixed';
			}
		}
	}

	function addMessage( type, content ) { //adds a message to the output list
		content = ( content.constructor == Array ) ? content.join( '' ) : content;
		if ( outputList ) {
			var newMsg = document.createElement( 'li' );
      var tooltip = '<pre class="classic">' + content + '</pre>';
			newMsg.className = 'bb-' + type;
			newMsg.title = type;
			newMsg.innerHTML = [ '<span class="bb-icon"></span>', content.slice(1,50), tooltip ].join( '' );
			outputList.appendChild( newMsg );
			scrollToBottom();
		} else {
			cache.push( [ '<li class="bb-', type, '" title="', type ,' message"><span class="bb-icon"></span>', content, '</li>' ].join( '' ) );
		}
	}

	
	function clear() { //clear list output
		outputList.innerHTML = '';
	}
	
	function clickControl( evt ) {
		if ( !evt ) evt = window.event;
		var el = ( evt.target ) ? evt.target : evt.srcElement;

		if ( el.tagName == 'SPAN' ) {
			switch ( el.getAttributeNode( 'op' ).nodeValue ) {
				case 'resize': resize(); break;
				case 'clear':  clear();  break;
				case 'close':  hide();   break;
			}
		}
	}
	
	function clickFilter( evt ) { //show/hide a specific message type
		if ( !evt ) evt = window.event;
		var span = ( evt.target ) ? evt.target : evt.srcElement;

		if ( span && span.tagName == 'SPAN' ) {

			var type = span.getAttributeNode( 'type' ).nodeValue;

			if ( evt.altKey ) {
				var filters = document.getElementById( IDs.filters ).getElementsByTagName( 'SPAN' );

				var active = 0;
				for ( entry in messageTypes ) {
					if ( messageTypes[ entry ] ) active++;
				}
				var oneActiveFilter = ( active == 1 && messageTypes[ type ] );

				for ( var i = 0; filters[ i ]; i++ ) {
					var spanType = filters[ i ].getAttributeNode( 'type' ).nodeValue;

					filters[ i ].className = ( oneActiveFilter || ( spanType == type ) ) ? 'bb-' + spanType : 'bb-' + spanType + ' bb-disabled';
					messageTypes[ spanType ] = oneActiveFilter || ( spanType == type );
				}
			}
			else {
				messageTypes[ type ] = ! messageTypes[ type ];
				span.className = ( messageTypes[ type ] ) ? 'bb-' + type : 'bb-' + type + ' bb-disabled';
			}

			//build outputList's class from messageTypes object
			var disabledTypes = [];
			for ( type in messageTypes ) {
				if ( ! messageTypes[ type ] ) disabledTypes.push( 'bb-' + type );
			}
			disabledTypes.push( '' );
			outputList.className = disabledTypes.join( '-hidden ' );

			scrollToBottom();
		}
	}

	function clickVis( evt ) {
		if ( !evt ) evt = window.event;
		var el = ( evt.target ) ? evt.target : evt.srcElement;
		
		var checkbox = ( el.tagName == 'SPAN' ) ? el : el.getElementsByTagName( 'SPAN' )[ 0 ];
		checkbox.className = ( checkbox.className == '' ) ? 'checked' : '';
		state.load = ( checkbox.className == 'checked' ) ? true : false;
		setState();
	}
	
	
	function scrollToBottom() { //scroll list output to the bottom
		outputList.scrollTop = outputList.scrollHeight;
	}
	
	function isVisible() { //determine the visibility
		return ( bbird.style.display == 'block' );
	}

	function hide() { 
        hidden = true;
		bbird.style.display = 'none';
	}
			
	function show() {
        hidden = false;
		var body = document.getElementsByTagName( 'BODY' )[ 0 ];
		body.removeChild( bbird );
		body.appendChild( bbird );
		bbird.style.display = 'block';
        // Random data
        var smoothie = new SmoothieChart({ grid: { strokeStyle: 'rgb(125, 0, 0)', fillStyle: 'rgb(60, 0, 0)', lineWidth: 1, millisPerLine: 250, verticalSections: 6 } });
        smoothie.addTimeSeries(time_data, { strokeStyle: 'rgb(0, 255, 0)', fillStyle: 'rgba(0, 255, 0, 0.4)', lineWidth: 3 });
        smoothie.streamTo(document.getElementById("timeseries"), 1000);


	}
	
	//sets the position
	function reposition( position ) {
		if ( position === undefined || position == null ) {
			position = ( state && state.pos === null ) ? 1 : ( state.pos + 1 ) % 4; //set to initial position ('topRight') or move to next position
		}
				
		switch ( position ) {
			case 0: classes[ 0 ] = 'bb-top-left'; break;
			case 1: classes[ 0 ] = 'bb-top-right'; break;
			case 2: classes[ 0 ] = 'bb-bottom-left'; break;
			case 3: classes[ 0 ] = 'bb-bottom-right'; break;
		}
		state.pos = position;
		setState();
	}

	function resize( size ) {
		if ( size === undefined || size === null ) {
			size = ( state && state.size == null ) ? 0 : ( state.size + 1 ) % 2;
			}

		classes[ 1 ] = ( size === 0 ) ? 'bb-small' : 'bb-large'

		var span = document.getElementById( IDs.size );
		span.title = ( size === 1 ) ? 'small' : 'large';
		span.className = ( size === 1) ? 'bb-contract' : 'bb-expand';

        document.getElementById( "timeseries" ).width = ( size === 1 ) ? 472 : 272;
        document.getElementById( "timeseries" ).clientHeight = 50;


		state.size = size;
		setState();
		scrollToBottom();
	}

	function setState() {
		var props = [];
		for ( entry in state ) {
			var value = ( state[ entry ] && state[ entry ].constructor === String ) ? '"' + state[ entry ] + '"' : state[ entry ]; 
			props.push( entry + ':' + value );
		}
		props = props.join( ',' );
		
		var expiration = new Date();
		expiration.setDate( expiration.getDate() + 14 );
		document.cookie = [ 'blackbird={', props, '}; expires=', expiration.toUTCString() ,';' ].join( '' );

		var newClass = [];
		for ( word in classes ) {
			newClass.push( classes[ word ] );
		}
		bbird.className = newClass.join( ' ' );
	}
	
	function getState() {
		var re = new RegExp( /blackbird=({[^;]+})(;|\b|$)/ );
		var match = re.exec( document.cookie );
		return ( match && match[ 1 ] ) ? eval( '(' + match[ 1 ] + ')' ) : { pos:null, size:null, load:null };
	}
	
	//event handler for 'keyup' event for window
	function readKey( evt ) {
		if ( !evt ) evt = window.event;
		var code = 113; //F2 key
					
		if ( evt && evt.keyCode == code ) {
					
			var visible = isVisible();
					
			if ( visible && evt.shiftKey && evt.altKey ) clear();
			else if	 (visible && evt.shiftKey ) reposition();
			else if ( !evt.shiftKey && !evt.altKey ) {
				( visible ) ? hide() : show();
			}
		}
	}

	//event management ( thanks John Resig )
	function addEvent( obj, type, fn ) {
		var obj = ( obj.constructor === String ) ? document.getElementById( obj ) : obj;
		if ( obj.attachEvent ) {
			obj[ 'e' + type + fn ] = fn;
			obj[ type + fn ] = function(){ obj[ 'e' + type + fn ]( window.event ) };
			obj.attachEvent( 'on' + type, obj[ type + fn ] );
		} else obj.addEventListener( type, fn, false );
	}
	function removeEvent( obj, type, fn ) {
		var obj = ( obj.constructor === String ) ? document.getElementById( obj ) : obj;
		if ( obj.detachEvent ) {
			obj.detachEvent( 'on' + type, obj[ type + fn ] );
			obj[ type + fn ] = null;
		} else obj.removeEventListener( type, fn, false );
	}

	
	window[ NAMESPACE ] = {
		toggle:
			function( visible ) { 
				if ( visible === true || visible === false ) {
					( visible ) ? show() : hide()
				} else if ( isVisible() ) {
					hide();
				} else {
					show();
				}
			},
		resize:
			function() { resize(); },
		clear:
			function() { clear(); },
		move:
			function() { reposition(); },
		debug:
			function( msg ) { addMessage( 'debug', msg ); },
		warn:
			function( msg ) { addMessage( 'warn', msg ); },
		info:
			function( msg ) { addMessage( 'info', msg ); },
		error:
			function( msg ) { addMessage( 'error', msg ); },

        increment: function () { count += 1; },

		profile:
			function( label ) {
				var currentTime = new Date(); //record the current time when profile() is executed
				
				if ( label == undefined || label == '' ) {
					addMessage( 'error', '<b>ERROR:</b> Please specify a label for your profile statement' );
				}
				else if ( profiler[ label ] ) {
					addMessage( 'profile', [ label, ': ', currentTime - profiler[ label ], 'ms' ].join( '' ) );
					delete profiler[ label ];
				}
				else {
					profiler[ label ] = currentTime;
					addMessage( 'profile', label );
				}
				return currentTime;
			}
	}

	addEvent( window, 'load', function() { /* initialize Blackbird when the page loads */
		var body = document.getElementsByTagName( 'BODY' )[ 0 ];
		bbird = body.appendChild( generateMarkup() );
		outputList = bbird.getElementsByTagName( 'OL' )[ 0 ];

		backgroundImage();
	
		//add events
		addEvent( IDs.checkbox, 'click', clickVis );
		addEvent( IDs.filters, 'click', clickFilter );
		addEvent( IDs.controls, 'click', clickControl );
		addEvent( document, 'keyup', readKey);

		resize( state.size );
		reposition( state.pos );
		if ( state.load ) {
			show();
			document.getElementById( IDs.checkbox ).getElementsByTagName( 'SPAN')[ 0 ].className = 'checked'; 
		}

		scrollToBottom();

		addEvent( window, 'unload', function() {
			removeEvent( IDs.checkbox, 'click', clickVis );
			removeEvent( IDs.filters, 'click', clickFilter );
			removeEvent( IDs.controls, 'click', clickControl );
			removeEvent( document, 'keyup', readKey );
		});
	});
	
	window.blackbird = {
		namespace:
			function( newNS ) {
				if ( newNS && newNS.constructor === String ) {
					window[ newNS ] = {};
					for ( method in window[ NAMESPACE ] ) {
						window[ newNS ][ method ] = window[ NAMESPACE ][ method ];
					}
					delete window[ NAMESPACE ];
					NAMESPACE = newNS;
				}
			}
	}
})();

function SmoothieChart(options) {
  // Defaults
  options = options || {};
  options.grid = options.grid || { fillStyle:'#000000', strokeStyle: '#777777', lineWidth: 1, millisPerLine: 1000, verticalSections: 2 };
  options.millisPerPixel = options.millisPerPixel || 20;
  options.fps = options.fps || 20;
  options.maxValueScale = options.maxValueScale || 1;
  options.minValue = options.minValue;
  options.labels = options.labels || { fillStyle:'#ffffff' }
  this.options = options;
  this.seriesSet = [];
}

SmoothieChart.prototype.addTimeSeries = function(timeSeries, options) {
  this.seriesSet.push({timeSeries: timeSeries, options: options || {}});
};

SmoothieChart.prototype.removeTimeSeries = function(timeSeries) {
	this.seriesSet.splice(this.seriesSet.indexOf(timeSeries), 1);
};

SmoothieChart.prototype.streamTo = function(canvas, delay) {
  var self = this;
  (function render() {
    self.render(canvas, new Date().getTime() - (delay || 0));
    setTimeout(render, 1000/self.options.fps);
  })()
};

SmoothieChart.prototype.render = function(canvas, time) {
  var canvasContext = canvas.getContext("2d");
  var options = this.options;
  var dimensions = {top: 0, left: 0, width: canvas.clientWidth, height: canvas.clientHeight};

  // Save the state of the canvas context, any transformations applied in this method
  // will get removed from the stack at the end of this method when .restore() is called.
  canvasContext.save();

  // Round time down to pixel granularity, so motion appears smoother.
  time = time - time % options.millisPerPixel;

  // Move the origin.
  canvasContext.translate(dimensions.left, dimensions.top);
  
  // Create a clipped rectangle - anything we draw will be constrained to this rectangle.
  // This prevents the occasional pixels from curves near the edges overrunning and creating
  // screen cheese (that phrase should neeed no explanation).
  canvasContext.beginPath();
  canvasContext.rect(0, 0, dimensions.width, dimensions.height);
  canvasContext.clip();

  // Clear the working area.
  canvasContext.save();
  canvasContext.fillStyle = options.grid.fillStyle;
  canvasContext.fillRect(0, 0, dimensions.width, dimensions.height);
  canvasContext.restore();

  // Grid lines....
  canvasContext.save();
  canvasContext.lineWidth = options.grid.lineWidth || 1;
  canvasContext.strokeStyle = options.grid.strokeStyle || '#ffffff';
  // Vertical (time) dividers.
  if (options.grid.millisPerLine > 0) {
    for (var t = time - (time % options.grid.millisPerLine); t >= time - (dimensions.width * options.millisPerPixel); t -= options.grid.millisPerLine) {
      canvasContext.beginPath();
      var gx = Math.round(dimensions.width - ((time - t) / options.millisPerPixel));
      canvasContext.moveTo(gx, 0);
      canvasContext.lineTo(gx, dimensions.height);
      canvasContext.stroke();
      canvasContext.closePath();
    }
  }

  // Horizontal (value) dividers.
  for (var v = 1; v < options.grid.verticalSections; v++) {
    var gy = Math.round(v * dimensions.height / options.grid.verticalSections);
    canvasContext.beginPath();
    canvasContext.moveTo(0, gy);
    canvasContext.lineTo(dimensions.width, gy);
    canvasContext.stroke();
    canvasContext.closePath();
  }
  // Bounding rectangle.
  canvasContext.beginPath();
  canvasContext.strokeRect(0, 0, dimensions.width, dimensions.height);
  canvasContext.closePath();
  canvasContext.restore();

  // Calculate the current scale of the chart, from all time series.
  var maxValue = Number.NaN;
  var minValue = Number.NaN;

  for (var d = 0; d < this.seriesSet.length; d++) {
      // TODO(ndunn): We could calculate / track these values as they stream in.
      var timeSeries = this.seriesSet[d].timeSeries;
      if (!isNaN(timeSeries.maxValue)) {
          maxValue = !isNaN(maxValue) ? Math.max(maxValue, timeSeries.maxValue) : timeSeries.maxValue;
      }

      if (!isNaN(timeSeries.minValue)) {
          minValue = !isNaN(minValue) ? Math.min(minValue, timeSeries.minValue) : timeSeries.minValue;
      }
  }

  if (isNaN(maxValue) && isNaN(minValue)) {
      return;
  }

  // Scale the maxValue to add padding at the top if required
  maxValue = maxValue * options.maxValueScale;
  // Set the minimum if we've specified one
  if (options.minValue != null)
    minValue = options.minValue;
  var valueRange = maxValue - minValue;
  
  // For each data set...
  for (var d = 0; d < this.seriesSet.length; d++) {
    canvasContext.save();
    var timeSeries = this.seriesSet[d].timeSeries;
    var dataSet = timeSeries.data;
    var seriesOptions = this.seriesSet[d].options;

    // Delete old data that's moved off the left of the chart.
    // We must always keep the last expired data point as we need this to draw the
    // line that comes into the chart, but any points prior to that can be removed.
    while (dataSet.length >= 2 && dataSet[1][0] < time - (dimensions.width * options.millisPerPixel)) {
      dataSet.splice(0, 1);
    }

    // Set style for this dataSet.
    canvasContext.lineWidth = seriesOptions.lineWidth || 1;
    canvasContext.fillStyle = seriesOptions.fillStyle;
    canvasContext.strokeStyle = seriesOptions.strokeStyle || '#ffffff';
    // Draw the line...
    canvasContext.beginPath();
    // Retain lastX, lastY for calculating the control points of bezier curves.
    var firstX = 0, lastX = 0, lastY = 0;
    for (var i = 0; i < dataSet.length; i++) {
      // TODO: Deal with dataSet.length < 2.
      var x = Math.round(dimensions.width - ((time - dataSet[i][0]) / options.millisPerPixel));
      var value = dataSet[i][1];
      var offset = maxValue - value;
      var scaledValue = valueRange ? Math.round((offset / valueRange) * dimensions.height) : 0;
      var y = Math.max(Math.min(scaledValue, dimensions.height - 1), 1); // Ensure line is always on chart.

      if (i == 0) {
        firstX = x;
        canvasContext.moveTo(x, y);
      }
      // Great explanation of Bezier curves: http://en.wikipedia.org/wiki/B�zier_curve#Quadratic_curves
      //
      // Assuming A was the last point in the line plotted and B is the new point,
      // we draw a curve with control points P and Q as below.
      //
      // A---P
      //     |
      //     |
      //     |
      //     Q---B
      //
      // Importantly, A and P are at the same y coordinate, as are B and Q. This is
      // so adjacent curves appear to flow as one.
      //
      else {
        canvasContext.bezierCurveTo( // startPoint (A) is implicit from last iteration of loop
          Math.round((lastX + x) / 2), lastY, // controlPoint1 (P)
          Math.round((lastX + x)) / 2, y, // controlPoint2 (Q)
          x, y); // endPoint (B)
      }

      lastX = x, lastY = y;
    }
    if (dataSet.length > 0 && seriesOptions.fillStyle) {
      // Close up the fill region.
      canvasContext.lineTo(dimensions.width + seriesOptions.lineWidth + 1, lastY);
      canvasContext.lineTo(dimensions.width + seriesOptions.lineWidth + 1, dimensions.height + seriesOptions.lineWidth + 1);
      canvasContext.lineTo(firstX, dimensions.height + seriesOptions.lineWidth);
      canvasContext.fill();
    }
    canvasContext.stroke();
    canvasContext.closePath();
    canvasContext.restore();
  }

  // Draw the axis values on the chart.
  if (!options.labels.disabled) {
      canvasContext.fillStyle = options.labels.fillStyle;
      var maxValueString = maxValue.toFixed(2);
      var minValueString = minValue.toFixed(2);
      canvasContext.fillText(maxValueString, dimensions.width - canvasContext.measureText(maxValueString).width - 2, 10);
      canvasContext.fillText(minValueString, dimensions.width - canvasContext.measureText(minValueString).width - 2, dimensions.height - 2);
  }

  canvasContext.restore(); // See .save() above.
}
