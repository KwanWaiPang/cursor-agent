// ECMAScript 5 strict mode
/* jshint globalstrict: true*/
/* global THREE, document, window,  console */
/* global onLoaded, LOADING_BAR_SCALE,ROWS,COLS,PIECE_SIZE, BOARD_SIZE, FLOOR_SIZE, WIREFRAME, DEBUG, Cell, WHITE, BLACK, FEEDBACK, SHADOW */
"use strict";

var geometries = {};
var textures   = {};


(function() {

	var bar, tips, label;
	var glow;

	function loadResources () {
		var loaded = 0;
		var resources = [
			'3D/json/board.json',
			'3D/json/innerBoard.json',
			'texture/wood-0.jpg',
			'texture/wood-1.jpg',
			'texture/wood_N.jpg',
			'texture/wood_S.jpg',
			'texture/floor.jpg',
			'texture/floor_N.jpg',
			'texture/floor_S.jpg',
			'texture/fakeShadow.jpg'
		];

		function loadJSON (url) {
			var loader = new THREE.JSONLoader();
			loader.load(url, function(geometry) {
				geometries[url] = geometry;
				loaded++;
				checkLoad();
			});
		}

		function loadImage(url) {
			THREE.ImageUtils.loadTexture(
				url,
				THREE.UVMapping(),
				function(texture) {
					textures[url] = texture;
					loaded++;
					checkLoad();
				}
			);
		}

		resources.forEach(function(url) {
			switch ( url.split('.').pop() ) {
			case 'json' :
				loadJSON(url);
				break;
			case 'jpg' :
				loadImage(url);
				break;
			default:
				throw 'invalid resource';
			}
		});

		function checkLoad () {
			bar.update(loaded/resources.length);
			if (loaded === resources.length) {
				setTimeout(onLoaded,0.1);
			}
		}

	}

	function initGlow() {
		var size = window.innerWidth*LOADING_BAR_SCALE*1.8;
		glow = document.createElement('canvas');
		glow.width  = size;
		glow.height = size;
		glow.id = 'c3d-glow';
		document.body.appendChild(glow);
		var ctx = glow.getContext('2d');

		glow.style.width = size + "px";
		glow.style.height = Math.round(size/2) + "px";

		var requestId;
		function animate() {
			update();
			requestId = window.requestAnimationFrame(animate);
		}

		function update() {
			ctx.clearRect(0,0,size,size);
			var cycle = Math.cos(Date.now()/1000 * Math.PI);
			var maxRadius = size/2.5;

			function lerp(a,b,p) {
				return a + (b-a)*p;
			}

			var amplitude = maxRadius * 0.015;
			var sizeOffset = cycle*amplitude;
			var radius = maxRadius - amplitude + sizeOffset;
			var saturation = lerp(70,100,(cycle+1)/2);

			var grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, radius);
			grd.addColorStop(0,    'hsla(90,'+saturation+'%,50%,0.5)');
			grd.addColorStop(0.125,'hsla(90,'+saturation+'%,50%,0.3828125)');
			grd.addColorStop(0.25, 'hsla(90,'+saturation+'%,50%,0.28125)');
			grd.addColorStop(0.375,'hsla(90,'+saturation+'%,50%,0.1953125)');
			grd.addColorStop(0.5,  'hsla(90,'+saturation+'%,50%,0.125)');
			grd.addColorStop(0.75, 'hsla(90,'+saturation+'%,50%,0.03125)');
			grd.addColorStop(1,    'hsla(90,'+saturation+'%,50%,0.0)');

			ctx.rect(0,0,size,size);
			ctx.fillStyle = grd;
			ctx.fill();
		}

		glow.remove = function() {
			window.cancelAnimationFrame(requestId);
			this.parentNode.removeChild(this);
		};

		animate();
	}


	function initTips() {
		var tipList = [
			"Aggregating wood fibers",
			"Generating pieces census report",
			"Testing board resistance",
			"Generating Matrix 8x8",
			"Answering Queen's request",
			"Carving a princess for the knight",
			"Sanding the Bishop",
			"Enrolling Pawns",
			"Generating cheat sheet",
			"Mating the king",
			"Planting virtual trees",
			"Asking Deep Blue for advice",
			"Nominating Bishops",
			"Dubbing Knights",
			"Crowning the King",
			"Waxing chessboard",
			"Evaluating the idea of an hexagonal board, and rejecting it",
			"Gathering extra vertices (just in case)",
			"Trimming edges",
			"Intimidating opponent",
			"Learning the rules"
		];

		tips = document.createElement('div');
		tips.id = 'tips';
		document.body.appendChild(tips);

		var tipTiming = 5000;

		tips.update = function() {
			var self = this;
			if( tipList.length > 0 ) {
				var index = Math.floor(Math.random() * tipList.length);
				var sentence = tipList[index];
				tipList.splice(index,1);
				this.textContent = sentence+"...";
			}
			this.timer = setTimeout(function(){self.update();},tipTiming);
		};

		var tipsRemove = tips.remove.bind(tips);
		tips.remove = function() {
			clearTimeout(this.timer);
			tipsRemove();
		};
		tips.update();
	}

	function initBar() {
		bar = document.createElement('div');
		bar.id = 'progressbar';
		bar.style.width = (LOADING_BAR_SCALE*100)+"%";
		label = document.createElement('div');
		label.id = 'progress-label';
		var fill = document.createElement('i');
		fill.className = 'c3d-progress-fill';
		bar.appendChild(fill);
		bar.appendChild(label);
		document.body.appendChild(bar);

		bar.update = function(p) {
			p = Math.round(p*100);
			fill.style.width = p + "%";
			label.textContent = p + "%";
		};

		bar.update(0);
	}

	function centering() {
		// CSS handles centering; keep listener so resize still recenters glow.
	}

	function removeLoader() {
		if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
		if (tips && tips.remove) tips.remove();
		if (glow && glow.remove) glow.remove();
		window.removeEventListener('resize',centering );
	}

	window.onload = function () {
		initGlow();
		initTips();
		initBar();
		centering();
		loadResources();
	};

	window.removeLoader = removeLoader;
})();
