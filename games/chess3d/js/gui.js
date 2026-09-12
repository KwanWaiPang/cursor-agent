// ECMAScript 5 strict mode
/* jshint globalstrict: true*/
/* jslint newcap: true */
/* global THREE, document, window, console */
/* global LOADING_BAR_SCALE,ROWS,COLS,PIECE_SIZE, BOARD_SIZE, FLOOR_SIZE, WIREFRAME, DEBUG, Cell, WHITE, BLACK, FEEDBACK, SHADOW */
/* global SearchAndRedraw, UIPlayMove, camera, levels, g_allMoves:true, promotion:true, g_backgroundEngine:true, validMoves, InitializeBackgroundEngine, EnsureAnalysisStopped, newGame, redrawBoard, parsePGN, g_playerWhite:true */
	/*global Search,FormatSquare,GenerateMove,MakeMove,GetMoveSAN,MakeSquare,UnmakeMove, FormatMove, ResetGame, GetFen, GetMoveFromString, alert, InitializeFromFen, GenerateValidMoves */
	/*global g_inCheck,g_board,g_pieceList, g_toMove, g_timeout:true,g_maxply:true */
	/*global moveflagCastleKing, moveflagCastleQueen, moveflagEPC, moveflagPromotion, colorWhite*/
	/*global moveflagPromoteQueen,moveflagPromoteRook,moveflagPromoteBishop,moveflagPromoteKnight*/
	/*global piecePawn, pieceKnight, pieceBishop, pieceRook, pieceQueen, pieceKing */
"use strict";
(function () {

	var pgnEl;
	var g_pgn = [];
	var infoEl;
	var fileInput;

	function el(tag, className, text) {
		var node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined) node.textContent = text;
		return node;
	}

	function initInfo() {
		infoEl = el("div");
		infoEl.id = "info";
		document.body.appendChild(infoEl);
	}

	function initGUI() {
		var gui = el("div");
		gui.id = "gui";

		gui.appendChild(el("h3", "panel-title", "新对局"));
		var setup = el("div", "setup-panel");

		var colorField = el("div", "field");
		var colorLabel = el("label", "", "你的执色");
		colorLabel.setAttribute("for", "humanColorSelect");
		var colorSelect = el("select");
		colorSelect.id = "humanColorSelect";
		var optW = el("option", "", "白（先手）");
		optW.value = "white";
		optW.selected = true;
		var optB = el("option", "", "黑（后手）");
		optB.value = "black";
		colorSelect.appendChild(optW);
		colorSelect.appendChild(optB);
		colorField.appendChild(colorLabel);
		colorField.appendChild(colorSelect);
		setup.appendChild(colorField);

		var levelSelect = el("select");
		levelSelect.id = "difficultySelect";
		var i;
		for (i = 0; i < levels.length; i++) {
			var opt = el("option", "", "等级 " + (i + 1) + (i === 0 ? "（最弱）" : i === levels.length - 1 ? "（最强）" : ""));
			opt.value = String(i);
			if (i === 4) opt.selected = true;
			levelSelect.appendChild(opt);
		}
		var levelField = el("div", "field");
		var levelLabel = el("label", "", "AI 等级");
		levelLabel.setAttribute("for", "difficultySelect");
		levelField.appendChild(levelLabel);
		levelField.appendChild(levelSelect);
		setup.appendChild(levelField);

		var startBtn = el("button", "btn-primary", "开始新对局");
		startBtn.type = "button";
		startBtn.addEventListener("click", startNewGameFromPanel);
		setup.appendChild(startBtn);
		gui.appendChild(setup);

		gui.appendChild(el("h3", "panel-title", "操作"));
		var ops = el("div", "ops-panel");
		var menu = el("ul");
		makeButton("悔棋", undo, menu);
		makeButton("载入", loadDialog, menu);
		makeButton("保存", save, menu);
		ops.appendChild(menu);

		var promoField = el("div", "field");
		var promoLabel = el("label", "", "升变");
		promoLabel.setAttribute("for", "promoSelect");
		var promoSelect = el("select");
		promoSelect.id = "promoSelect";
		["后", "车", "象", "马"].forEach(function (name) {
			promoSelect.appendChild(el("option", "", name));
		});
		promoSelect.addEventListener("change", changePromo);
		promoField.appendChild(promoLabel);
		promoField.appendChild(promoSelect);
		ops.appendChild(promoField);

		pgnEl = el("textarea");
		pgnEl.cols = 30;
		pgnEl.rows = 8;
		pgnEl.readOnly = true;
		pgnEl.setAttribute("aria-label", "棋谱 PGN");
		ops.appendChild(pgnEl);

		fileInput = el("input");
		fileInput.type = "file";
		fileInput.accept = ".pgn,.txt,text/plain";
		fileInput.hidden = true;
		fileInput.addEventListener("change", function (evt) {
			load(evt);
			fileInput.value = "";
		});
		ops.appendChild(fileInput);

		gui.appendChild(ops);
		document.body.appendChild(gui);
	}

	function makeButton(name, callback, parent) {
		var item = el("li");
		var button = el("button", "", name);
		button.type = "button";
		button.addEventListener("click", callback);
		item.appendChild(button);
		parent.appendChild(item);
		return button;
	}

	function startNewGameFromPanel() {
		var colorVal = document.getElementById("humanColorSelect").value;
		var level = parseInt(document.getElementById("difficultySelect").value, 10);
		if (isNaN(level) || level < 0 || level >= levels.length) level = 4;
		newGame(colorVal === "black" ? BLACK : WHITE, level);
	}

	function newGame(color,level) {
		if (levels[level] !== undefined) {
			g_timeout = levels[level].timeout;
			g_maxply  = levels[level].maxply;
		}

		EnsureAnalysisStopped();
		ResetGame();
		if (InitializeBackgroundEngine()) {
			g_backgroundEngine.postMessage("go");
		}

		g_allMoves = [];
		clearPGN();

		redrawBoard();

		if (color === WHITE) {
			g_playerWhite = true;
			camera.position.x = 0;
			camera.position.z = 100;
		} else {
			g_playerWhite = false;
			SearchAndRedraw();
			camera.position.x = 0;
			camera.position.z = -100;
		}
	}

	function undo() {
		if (g_allMoves.length === 0) {
			return;
		}

		if (g_backgroundEngine !== null) {
			g_backgroundEngine.terminate();
			g_backgroundEngine = null;
		}

		UnmakeMove(g_allMoves[g_allMoves.length - 1]);
		g_allMoves.pop();
		g_pgn.pop();
		g_pgn.pop();
		updatePGN();

		if (g_playerWhite !== Boolean(g_toMove) && g_allMoves.length !== 0) {
			UnmakeMove(g_allMoves[g_allMoves.length - 1]);
			g_allMoves.pop();
		}

		redrawBoard();
	}

	function loadDialog() {
		if (fileInput) fileInput.click();
	}

	function load(evt) {
		var file = evt.target.files[0];
		if (file) {
			var reader = new FileReader();
			reader.onload = function(e) {
				loadPGN(e.target.result);
			};
			reader.readAsText(file);
		} else {
			console.log("Failed to load file");
		}
	}

	function loadFEN(fen) {
		g_allMoves = [];
		InitializeFromFen(fen);

		EnsureAnalysisStopped();
		InitializeBackgroundEngine();

		g_playerWhite = !!g_toMove;
		g_backgroundEngine.postMessage("position " + GetFen());

		redrawBoard();
	}

	function loadPGN (pgn) {
		var parsedPGN = parsePGN(pgn);
		var fen   = parsedPGN.fen;
		var moves = parsedPGN.sequence;

		g_allMoves = [];
		clearPGN();
		if (fen !== null) {
			loadFEN(fen);
			if (parsedPGN.startColor === BLACK) {
				g_pgn.push("..");
			}
		} else {
			ResetGame();
		}

		function Piece(flag,promo) {
			this.flag  = flag;
			this.promo = promo;
		}

		moves.forEach(function(move) {
			var i;
			var formatedMove;
			var vMoves = GenerateValidMoves();
			var pieces = {
				"P": new Piece(piecePawn,null),
				"N": new Piece(pieceKnight,moveflagPromoteKnight),
				"B": new Piece(pieceBishop,moveflagPromoteBishop),
				"R": new Piece(pieceRook,moveflagPromoteRook),
				"Q": new Piece(pieceQueen,moveflagPromoteQueen),
				"K": new Piece(pieceKing,null)
			};

			var piece = pieces[move.piece].flag;
			var color = (move.color === WHITE) ? 0x8 : 0x0;
			var startList = [];
			var pieceIdx = (color|piece) << 4;

			while(g_pieceList[pieceIdx] !== 0) {
				startList.push(new Cell(FormatSquare(g_pieceList[pieceIdx])));
				pieceIdx++;
			}

			var from = move.from;
			if (from !== undefined) {
				for (i = startList.length - 1; i >= 0; i--) {
					if( from.length === 1) {
						if (from.match(/[a-h]/) && startList[i].position.charAt(0) !== from) {
							startList.splice(i,1);
						} else if (from.match(/[1-8]/) && startList[i].position.charAt(1) !== from) {
							startList.splice(i,1);
						}
					} else if (from.length === 2) {
						if (startList[i].position !== from) {
							startList.splice(i,1);
						}
					}
				}
			}

			var end   = new Cell(move.to);
			var endSquare   = MakeSquare(end.y, end.x);
			var promotionFlag = (move.promotion) ? pieces[move.promotion.substr(1)].promo : undefined;

			function checkMove(start) {
				var startSquare = MakeSquare(start.y, start.x);
				if (promotionFlag !== undefined) {
					if(vMoves[i] === GenerateMove(startSquare, endSquare, moveflagPromotion | promotionFlag)) {
						formatedMove = vMoves[i];
					}
				} else {
					if ( (vMoves[i] & 0xFF)       == startSquare &&
						((vMoves[i] >> 8) & 0xFF) == endSquare ) {
						formatedMove = vMoves[i];
					}
				}
			}

			for (i = 0; i < vMoves.length; i++) {
				startList.forEach(checkMove);
				if (formatedMove) break;
			}

			if(formatedMove) {
				UIPlayMove(formatedMove,false);
			} else {
				console.log(move);
				throw "Invalid PGN";
			}
		});

		if (g_toMove === colorWhite) {
			g_playerWhite = true;
			camera.position.x = 0;
			camera.position.z = 100;
		} else {
			g_playerWhite = false;
			camera.position.x = 0;
			camera.position.z = -100;
		}

		EnsureAnalysisStopped();
		if (InitializeBackgroundEngine()) {
			g_backgroundEngine.postMessage("position " + GetFen());
		}

		redrawBoard();
	}

	function clearPGN () {
		if (pgnEl) pgnEl.value = "";
		g_pgn = [];
	}

	function addToPGN(move) {
		g_pgn.push(GetMoveSAN(move));
		updatePGN();
	}

	function updatePGN() {
		if (!pgnEl) return;
		pgnEl.value = getPGN();
		pgnEl.scrollTop = pgnEl.scrollHeight;
	}

	function getPGN() {
		var str = "";
		g_pgn.forEach(function(move,i) {
			if(i%2 === 0) {
				if (move === "..") {
					str += ((i/2)+1)+"...";
				} else {
					str += ((i/2)+1)+". "+move;
				}
			} else {
				str += " "+move+"\r\n";
			}
		});
		return str;
	}

	function save() {
		var filename = "chessSave.pgn";
		var a = document.createElement("a");

		if (typeof a.download === "undefined")
		{
			var str = 'data:text/html,' + encodeURIComponent("<p><a download='" + filename + "' href=\"data:application/json," +
				encodeURIComponent(getPGN()) +
				"\">Download link</a></p>");
			window.open(str);
		} else {
			var body = document.body;
			a.textContent = filename;
			a.href = "data:application/json," + encodeURIComponent(getPGN());
			a.download = filename;
			body.appendChild(a);
			var clickEvent = document.createEvent("MouseEvent");
			clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			a.dispatchEvent(clickEvent);
			body.removeChild(a);
		}
	}

	function changePromo(event) {
		var choice = event.currentTarget.value;
		switch(choice) {
		case "后":
		case "Queen":
			promotion = moveflagPromoteQueen;
			break;
		case "车":
		case "Rook":
			promotion = moveflagPromoteRook;
			break;
		case "象":
		case "Bishop":
			promotion = moveflagPromoteBishop;
			break;
		case "马":
		case "Knight":
			promotion = moveflagPromoteKnight;
			break;
		}
	}

	function displayCheck() {
		if (!infoEl) return;
		if (validMoves.length === 0) {
			infoEl.textContent = ( g_inCheck ? '将死' : '逼和' );
		} else if (g_inCheck) {
			infoEl.textContent = '将军';
		} else {
			infoEl.textContent = '';
		}
		if (infoEl.textContent !== '') {
			infoEl.classList.add("is-on");
		} else {
			infoEl.classList.remove("is-on");
		}
	}

	window.initGUI  = initGUI;
	window.initInfo = initInfo;
	window.clearPGN = clearPGN;
	window.addToPGN = addToPGN;
	window.displayCheck = displayCheck;
	window.newGame = newGame;

})();
