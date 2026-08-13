// ECMAScript 5 strict mode
/* jshint globalstrict: true*/
/* global THREE, $, document, window, console */
/* global LOADING_BAR_SCALE,ROWS,COLS,PIECE_SIZE, BOARD_SIZE, FLOOR_SIZE, WIREFRAME, DEBUG, Cell, WHITE, BLACK, FEEDBACK, SHADOW */
/* global createCell */

/* 
 * initPieceFactory and initCellFactory need to be called after
 * all ressources are loaded (geometry and texture)
 *
 * they will create the createPiece and createCell function
 * and keep some texture/material objects in a closure to avoid
 * unnecessary cloning
 */

"use strict";
var geometries = {};
var textures = {};

function initPieceFactory () {
	// 程序化斯顿顿轮廓 + 顶部汉字标，远比旧 JSON 细模清晰
	var sideLook = [];
	sideLook[BLACK] = {
		color: 0x1a1512,
		specular: 0x777777,
		shininess: 32,
		emissive: 0x0a0806
	};
	sideLook[WHITE] = {
		color: 0xf5efe3,
		specular: 0xffffff,
		shininess: 78,
		emissive: 0x2c2418
	};

	var labels = {
		pawn: "兵",
		rook: "车",
		knight: "马",
		bishop: "象",
		queen: "后",
		king: "王"
	};

	function makeBodyMaterial(color) {
		var look = sideLook[color] || sideLook[WHITE];
		return new THREE.MeshPhongMaterial({
			color: look.color,
			specular: look.specular,
			shininess: look.shininess,
			emissive: look.emissive,
			wireframe: WIREFRAME
		});
	}

	function makeAccentMaterial(color) {
		return new THREE.MeshPhongMaterial({
			color: color === WHITE ? 0xc9a45c : 0x8a7350,
			specular: 0xcccccc,
			shininess: 50,
			emissive: color === WHITE ? 0x3a2a10 : 0x1a1408,
			wireframe: WIREFRAME
		});
	}

	function addMesh(group, geo, mat, y, sx, sy, sz) {
		var mesh = new THREE.Mesh(geo, mat);
		mesh.position.y = y || 0;
		if (sx || sy || sz) {
			mesh.scale.set(sx || 1, sy || 1, sz || 1);
		}
		if (SHADOW) {
			mesh.castShadow = true;
			mesh.receiveShadow = true;
		}
		group.add(mesh);
		return mesh;
	}

	function makeLabelDisc(size, color, text) {
		var canvas = document.createElement("canvas");
		canvas.width = 128;
		canvas.height = 128;
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, 128, 128);
		ctx.beginPath();
		ctx.arc(64, 64, 58, 0, Math.PI * 2);
		ctx.fillStyle = color === WHITE ? "#f7f1e4" : "#1c1713";
		ctx.fill();
		ctx.lineWidth = 6;
		ctx.strokeStyle = color === WHITE ? "#8a6a2b" : "#c9a45c";
		ctx.stroke();
		ctx.fillStyle = color === WHITE ? "#1a1512" : "#f5efe3";
		ctx.font = "bold 56px 'Noto Serif SC','ZCOOL XiaoWei',serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, 64, 68);

		var tex = new THREE.Texture(canvas);
		tex.needsUpdate = true;
		var mat = new THREE.MeshBasicMaterial({
			map: tex,
			transparent: true,
			depthWrite: false
		});
		var disc = new THREE.Mesh(
			new THREE.PlaneGeometry(size * 0.42, size * 0.42),
			mat
		);
		disc.rotation.x = -Math.PI / 2;
		disc.name = "label";
		return disc;
	}

	function buildBase(body, mat, accent, size) {
		addMesh(body, new THREE.CylinderGeometry(size * 0.52, size * 0.58, size * 0.12, 28), mat, size * 0.06);
		addMesh(body, new THREE.CylinderGeometry(size * 0.42, size * 0.50, size * 0.08, 28), accent, size * 0.14);
	}

	function buildPawn(body, mat, accent, size) {
		buildBase(body, mat, accent, size);
		addMesh(body, new THREE.CylinderGeometry(size * 0.16, size * 0.28, size * 0.18, 20), accent, size * 0.24);
		addMesh(body, new THREE.CylinderGeometry(size * 0.12, size * 0.22, size * 0.48, 20), mat, size * 0.52);
		addMesh(body, new THREE.SphereGeometry(size * 0.22, 24, 16), mat, size * 0.88);
		return size * 1.12;
	}

	function buildRook(body, mat, accent, size) {
		buildBase(body, mat, accent, size);
		addMesh(body, new THREE.CylinderGeometry(size * 0.28, size * 0.34, size * 0.92, 8), mat, size * 0.66);
		addMesh(body, new THREE.CylinderGeometry(size * 0.40, size * 0.40, size * 0.16, 8), accent, size * 1.16);
		var i, tooth;
		for (i = 0; i < 4; i++) {
			tooth = addMesh(body, new THREE.CubeGeometry(size * 0.18, size * 0.28, size * 0.18), mat, size * 1.36);
			tooth.position.x = Math.cos(i * Math.PI / 2) * size * 0.30;
			tooth.position.z = Math.sin(i * Math.PI / 2) * size * 0.30;
		}
		return size * 1.58;
	}

	function buildKnight(body, mat, accent, size, color) {
		buildBase(body, mat, accent, size);
		addMesh(body, new THREE.CylinderGeometry(size * 0.20, size * 0.32, size * 0.40, 16), mat, size * 0.40);
		var chest = addMesh(body, new THREE.CubeGeometry(size * 0.28, size * 0.55, size * 0.36), mat, size * 0.78);
		chest.rotation.z = (color === WHITE ? 1 : -1) * 0.18;
		chest.position.x = (color === WHITE ? -1 : 1) * size * 0.04;
		var neck = addMesh(body, new THREE.CylinderGeometry(size * 0.10, size * 0.20, size * 0.42, 12), mat, size * 1.12);
		neck.rotation.z = (color === WHITE ? 1 : -1) * 0.55;
		neck.position.x = (color === WHITE ? -1 : 1) * size * 0.10;
		var head = addMesh(body, new THREE.CubeGeometry(size * 0.62, size * 0.26, size * 0.24), mat, size * 1.40);
		head.position.x = (color === WHITE ? -1 : 1) * size * 0.22;
		head.rotation.z = (color === WHITE ? 1 : -1) * 0.18;
		var snout = addMesh(body, new THREE.CubeGeometry(size * 0.32, size * 0.14, size * 0.16), mat, size * 1.34);
		snout.position.x = (color === WHITE ? -1 : 1) * size * 0.50;
		var ear = addMesh(body, new THREE.CubeGeometry(size * 0.10, size * 0.28, size * 0.08), accent, size * 1.62);
		ear.position.x = (color === WHITE ? -1 : 1) * size * 0.02;
		var mane = addMesh(body, new THREE.CubeGeometry(size * 0.12, size * 0.34, size * 0.18), accent, size * 1.22);
		mane.position.x = (color === WHITE ? 1 : -1) * size * 0.08;
		return size * 1.78;
	}

	function buildBishop(body, mat, accent, size) {
		buildBase(body, mat, accent, size);
		addMesh(body, new THREE.CylinderGeometry(size * 0.14, size * 0.32, size * 1.05, 24), mat, size * 0.72);
		addMesh(body, new THREE.CylinderGeometry(size * 0.26, size * 0.26, size * 0.08, 20), accent, size * 1.26);
		addMesh(body, new THREE.SphereGeometry(size * 0.24, 20, 14), mat, size * 1.50, 1, 1.45, 1);
		var slit = addMesh(body, new THREE.CubeGeometry(size * 0.05, size * 0.28, size * 0.22), accent, size * 1.52);
		slit.rotation.z = 0.15;
		addMesh(body, new THREE.SphereGeometry(size * 0.09, 12, 10), accent, size * 1.88);
		return size * 2.02;
	}

	function buildQueen(body, mat, accent, size) {
		buildBase(body, mat, accent, size);
		addMesh(body, new THREE.CylinderGeometry(size * 0.15, size * 0.34, size * 1.22, 24), mat, size * 0.82);
		addMesh(body, new THREE.CylinderGeometry(size * 0.32, size * 0.32, size * 0.10, 24), accent, size * 1.48);
		var i, tip;
		for (i = 0; i < 8; i++) {
			tip = addMesh(body, new THREE.CylinderGeometry(0.01, size * 0.07, size * 0.22, 8), accent, size * 1.64);
			tip.position.x = Math.cos(i * Math.PI * 2 / 8) * size * 0.24;
			tip.position.z = Math.sin(i * Math.PI * 2 / 8) * size * 0.24;
		}
		addMesh(body, new THREE.SphereGeometry(size * 0.16, 14, 12), mat, size * 1.82);
		addMesh(body, new THREE.SphereGeometry(size * 0.07, 10, 8), accent, size * 1.98);
		return size * 2.08;
	}

	function buildKing(body, mat, accent, size) {
		buildBase(body, mat, accent, size);
		addMesh(body, new THREE.CylinderGeometry(size * 0.17, size * 0.34, size * 1.28, 24), mat, size * 0.84);
		addMesh(body, new THREE.CylinderGeometry(size * 0.30, size * 0.36, size * 0.20, 24), accent, size * 1.54);
		var crossV = addMesh(body, new THREE.CubeGeometry(size * 0.11, size * 0.52, size * 0.11), accent, size * 1.96);
		var crossH = addMesh(body, new THREE.CubeGeometry(size * 0.38, size * 0.12, size * 0.12), accent, size * 2.02);
		crossV.name = "cross";
		crossH.name = "cross";
		return size * 2.28;
	}

	var builders = {
		pawn: buildPawn,
		rook: buildRook,
		knight: buildKnight,
		bishop: buildBishop,
		queen: buildQueen,
		king: buildKing
	};

	function createPiece(name, color) {
		var size = BOARD_SIZE / COLS * PIECE_SIZE;
		var piece = new THREE.Object3D();
		var mat = makeBodyMaterial(color);
		var accent = makeAccentMaterial(color);
		var body = new THREE.Object3D();
		var builder = builders[name] || buildPawn;
		builder(body, mat, accent, size, color);

		var label = makeLabelDisc(size, color, labels[name] || "?");
		label.position.y = size * 0.155;

		piece.add(body);
		piece.add(label);
		piece.name = name;
		piece.color = color;
		piece.bodyMaterial = mat;
		piece.accentMaterial = accent;
		piece.labelMaterial = label.material;

		return piece;
	}

	window.createPiece = createPiece;
}

function initCellFactory() {

	var materials = [];
	var tiling = 2;


	// common textures
	var diff;
	var norm = textures['texture/wood_N.jpg'].clone();
	norm.tile(tiling);
	var spec = textures['texture/wood_S.jpg'].clone();
	spec.tile(tiling);

	for(var c = 0; c<2; c++) {

		diff = textures['texture/wood-'+c+'.jpg'].clone();
		diff.tile(tiling);

		//common material
		materials[c] =  new THREE.MeshPhongMaterial({
			color:0xffffff,
			specular:[0xAAAAAA,0x444444][c],
			shininess:30.0,
			wireframe:WIREFRAME,
			transparent:true,
			map:diff,
			specularMap:spec,
			normalMap:norm,
			//blending: THREE.AdditiveBlending,
			opacity:0.5
		});
		//materials[c].normalScale.set(0.5,0.5);
	}

	function createCell(size,color) {
		// container for the cell and its reflexion
		var geo = new THREE.PlaneGeometry(size,size);

		// randomize uv offset to ad a bit of variety
		var randU = Math.random();
		var randV = Math.random();

		var uvs = geo.faceVertexUvs[0][0];
		for (var j = 0; j < uvs.length; j++) {
			uvs[j].x += randU;
			uvs[j].y += randV;
		}

		var cell = new THREE.Mesh(geo,materials[color]);

		if (SHADOW) {
			cell.receiveShadow = true;
		}

		// by default PlaneGeometry is vertical
		cell.rotation.x = -Math.PI/2;
		cell.color = color;
		return cell;
	}

	// make it global
	window.createCell = createCell;
}


function createChessBoard(size) {
	// contains everything that makes the board
	var lChessBoard = new THREE.Object3D();

	var cellSize = size/COLS;
	var square,cell;

	for(var i=0; i< ROWS*COLS; i++) {

		var col = i%COLS;
		var row = Math.floor(i/COLS);

		cell = new Cell(i);
		square = createCell(cellSize,1-(i+row)%2);
		square.position = cell.getWorldPosition();
		square.name = cell.position;

		lChessBoard.add(square);
	}

	// some fake inner environment color for reflexion
	var innerBoard = new THREE.Mesh (
		geometries['3D/json/innerBoard.json'],
		new THREE.MeshBasicMaterial({
			color:0x783e12
		})
	);
	innerBoard.scale.set(size,size,size);

	/// board borders
	var tiling = 6;
	var wood = textures['texture/wood-0.jpg'].clone();
	var spec = textures['texture/wood_S.jpg'].clone();
	var norm = textures['texture/wood_N.jpg'].clone();
	wood.tile(tiling);
	spec.tile(tiling);
	norm.tile(tiling);

	var geo = geometries['3D/json/board.json'];
	geo.computeBoundingBox();

	var board = new THREE.Mesh (
		geo,
		new THREE.MeshPhongMaterial({
			color:0xffffff,
			map:wood,
			specular: 0xffffff,
			specularMap: spec,
			normalMap: norm,
			shininess: 60,
			normalScale: new THREE.Vector2(0.2,0.2)
		})
	);
	var hCorrection = 0.62; // yeah I should just create a better geometry
	board.scale.set(size,size*hCorrection,size);
	lChessBoard.height = geo.boundingBox.min.y * board.scale.y;

	if (SHADOW) {
		board.receiveShadow = true;
		board.castShadow = true;
	}

	lChessBoard.add(innerBoard);
	lChessBoard.add(board);

	lChessBoard.name = "chessboard";
	return lChessBoard;
}

function createFloor(size,chessboardSize) {
	// The floor is a fake plane with a hole in it to allow
	// for the fake reflexion trick to work
	// so we build it vertices by vertices

	// material
	var tiling = 30*size/1000;
	var material = new THREE.MeshPhongMaterial({
		color:0xffffff,
		wireframe:WIREFRAME	,
		specular:0xaaaaaa,
		shininess:30

	});
	var diff  = textures['texture/floor.jpg'];
	var spec  = textures['texture/floor_S.jpg'];
	var norm  = textures['texture/floor_N.jpg'];
	var light = textures['texture/fakeShadow.jpg'];

	diff.tile(tiling);
	spec.tile(tiling);
	norm.tile(tiling);
	light.format = THREE.RGBFormat;

	material.map = diff;
	material.normalMap = norm;
	material.normalScale.set(0.6,0.6);
	material.specularMap = spec;
	material.lightMap = light;

	// geometry
	var halfBoard = chessboardSize/2;
	var halfSize  = size/2;

	var floorGeo = new THREE.Geometry();
	// outter vertices
	floorGeo.vertices.push(new THREE.Vector3(-halfSize,0,-halfSize));
	floorGeo.vertices.push(new THREE.Vector3( halfSize,0,-halfSize));
	floorGeo.vertices.push(new THREE.Vector3( halfSize,0, halfSize));
	floorGeo.vertices.push(new THREE.Vector3(-halfSize,0, halfSize));
	// hole vertices
	floorGeo.vertices.push(new THREE.Vector3(-halfBoard,0,-halfBoard));
	floorGeo.vertices.push(new THREE.Vector3( halfBoard,0,-halfBoard));
	floorGeo.vertices.push(new THREE.Vector3( halfBoard,0, halfBoard));
	floorGeo.vertices.push(new THREE.Vector3(-halfBoard,0, halfBoard));

	floorGeo.faceVertexUvs[ 0 ] = [];
	floorGeo.faceVertexUvs[ 1 ] = [];

    /*
     *        vertices         uvs-lightmap
     *      0-----------1     80-----------80   
     *      |\         /|      |\         /| 
     *      | \       / |      | \       / | 
     *      |  \     /  |      |  \     /  |
     *      |   4---5   |      |   0---0   |
     *      |   |   |   |      |   |   |   |
     *      |   7---6   |      |   0---0   |
     *      |  /     \  |      |  /     \  |
     *      | /       \ |      | /       \ |
     *      |/         \|      |/         \|
     *      3-----------2     80-----------80
     */

    // all normals just points upward
	var normal = new THREE.Vector3( 0, 1, 0 );

	// list of vertex index for each face
	var faces = [
		[0,4,5,1],
		[1,5,6,2],
		[2,6,7,3],
		[3,7,4,0]
	];

	faces.forEach( function(f) {
		var uvs1 = [];
		var uvs2 = [];
		var lightU,lightV;
		f.forEach(function(v,i) {
			// we linearily transform positions
			// from a -halfSize-halfSize space
			// to a 0-1 space
			uvs1.push(new THREE.Vector2(
				(floorGeo.vertices[v].x+halfSize)/size,
				(floorGeo.vertices[v].z+halfSize)/size
			));
			lightU = (v < 4) ? 80 : 0;
			lightV = (i < 2) ? 0 : 1;
			uvs2.push(new THREE.Vector2(lightU,lightV));
		});

		// we create a new face folowing the faces list
		var face = new THREE.Face4(
			f[0],f[1],f[2],f[3]
		);

		// and apply normals (without this, no proper lighting)
		face.normal.copy( normal );
		face.vertexNormals.push(
			normal.clone(),
			normal.clone(),
			normal.clone(),
			normal.clone()
		);

		// add the face to the geometry's faces list
		floorGeo.faces.push(face);

		// add uv coordinates to uv channels.
		floorGeo.faceVertexUvs[ 0 ].push(uvs1); // for diffuse/normal
		floorGeo.faceVertexUvs[ 1 ].push(uvs2); // for lightmap

	});

	// not sure it's needed but since it's in THREE.PlaneGeometry...
	floorGeo.computeCentroids();

	var floor = new THREE.Mesh(floorGeo,material);

	if(SHADOW) {
		floor.receiveShadow = true;
	}


	floor.name = "floor";
	return floor;
}

// special highlighting materials
var validCellMaterial = null;
function createValidCellMaterial () {
	validCellMaterial = [];
	var tiling = 2;


	// common textures
	var diff;
	var norm = textures['texture/wood_N.jpg'].clone();
	norm.tile(tiling);
	var spec = textures['texture/wood_S.jpg'].clone();
	spec.tile(tiling);

	for(var c = 0; c<2; c++) {

		diff = textures['texture/wood-1.jpg'].clone();
		diff.tile(tiling);

		//common material
		validCellMaterial[c] =  new THREE.MeshPhongMaterial({
			color:0x00ff00,
			specular:0x999999,
			shininess:60.0,
			wireframe:WIREFRAME,
			map:diff,
			specularMap:spec,
			normalMap:norm
		});
		//materials[c].normalScale.set(0.5,0.5);
	}
}

var selectedMaterial = null;
var selectedPieceMaterial = null;
function createSelectedMaterial() {
	selectedMaterial = [];
	selectedPieceMaterial = [];
	var tiling = 4;


	// common textures
	var diff;
	var norm = textures['texture/wood_N.jpg'].clone();
	norm.tile(tiling);
	var spec = textures['texture/wood_S.jpg'].clone();
	spec.tile(tiling);

	for(var c = 0; c<2; c++) {

		diff = textures['texture/wood-1.jpg'].clone();
		diff.tile(tiling);

		//common material
		selectedMaterial[c] =  new THREE.MeshPhongMaterial({
			color:0x00ff00,
			emissive:0x009900,
			specular:0x999999,
			shininess:60.0,
			wireframe:WIREFRAME,
			transparent:false,
			map:diff,
			specularMap:spec,
			normalMap:norm
			//opacity:0.4
		});
		selectedMaterial[c].normalScale.set(0.3,0.3);

		selectedPieceMaterial[c] = new THREE.MeshPhongMaterial({
			color: c === WHITE ? 0xd8f5c8 : 0x6fbf5a,
			emissive: 0x1f7a28,
			specular: 0xaad4aa,
			shininess: 55,
			wireframe: WIREFRAME
		});
	}

}