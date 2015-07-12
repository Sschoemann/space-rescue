var imageRepository = new function() {
	this.background = new Image();
	this.ship = new Image();
	this.obstacle = new Image();
	this.objective = new Image();

	var imageCount = 4;
	var loadedImages = 0;

	var loadImage = function(){
		loadedImages++;
		console.log("Image loaded");
		if(imageCount == loadedImages){
			displayGreeting();
			//init();
		}
	}

	this.background.onload = loadImage;
	this.ship.onload = loadImage;
	this.obstacle.onload = loadImage;
	this.objective.onload = loadImage;

	this.background.src = "img/bg2.png";
	this.ship.src = "img/tPlayer.png";
	this.obstacle.src = "img/obstacle/a10000.png";
	this.objective.src = "img/objective/ufo.png";
}

// Drawable Class - parent of all drawable objects,
// such as bullets and ships
function Drawable(){
	this.speed = 0;
	this.collidableWith = "";
	this.isColliding = false;
	this.type = "";
	
	this.init = function(x, y, width, height, canvas){	
		this.x = x;
		this.y = y;
		
		this.width = width;
		this.height = height;

		this.context = canvas.getContext("2d");
		
		this.canvasWidth = canvas.width;
		this.canvasHeight = canvas.height;

		this.isAlive = true;
	};
	
	this.draw = function(){
		// to be implemented by each descendant class;
	};

	this.isCollidableWith = function(object) {
		return (this.collidableWith === object.type);
	};
}


// Spawnable Class - parent of all objects
// that can belong to the object pool
function Spawnable(){
	this.inUse = false;

	this.spawn = function(x, y, speed){
		this.x = x;
		this.y = y;
		this.speed = speed;
		this.inUse = true;
	};

	this.clear = function(){
		this.x = 0;
		this.y = 0;
		this.speed = 0;
		this.inUse = false;
		this.isColliding = false;
	};
}
Spawnable.prototype = new Drawable();

// Background Class, extends Drawable:
function Background(){
	this.speed = 2;

	this.draw = function(){
		this.y += this.speed;

		// if the image scrolled off the screen, reset:
		if(this.y >= this.canvasHeight)
			this.y = this.canvasHeight - this.height;

		this.context.drawImage(imageRepository.background, this.x, this.y);
		this.context.drawImage(imageRepository.background, this.x, this.y - this.height);
	};
}
Background.prototype = new Drawable();


function Collidable() {
	this.spawn = function(x, y, speed, type){
		this.x = x;
		this.y = y;
		this.speed = speed;
		this.inUse = true;
		this.type = type;
		this.collidedWith = "";
	};

	// returns false if the asteroid has moved beyond the visible game world, and
	// does not need to be drawn. otherwise, draws the asteroid and returns true
	this.draw = function(){	
		if(this.inUse) {
			this.context.clearRect(this.x, this.y, this.width, this.height);
			
			if(this.type == "objective" && this.collidedWith == "ship"){
				game.ufo.play();
				game.playerScore += 20;
				return false;
			}

			if(this.type == "obstacle" && this.collidedWith == "ship"){
				//game.playerScore -= 20;
				game.ship.isAlive = false;
				this.context.clearRect(this.x, this.y, this.width, this.height);
				game.endGame(); 
				return false; 
			}

			if(this.y < this.canvasHeight) {
				this.y += this.speed;
			}

			if(this.y >= this.canvasHeight){
				return false;
			}
			if(this.type == "obstacle")
				this.context.drawImage(imageRepository["obstacle"], this.x, this.y);
			else 
				this.context.drawImage(imageRepository["objective"], this.x, this.y);
			return true;
		}
		return false;
	};
}
Collidable.prototype = new Spawnable();


// Ship Class, extends Drawable:
function Ship(){
	this.speed = 3;
	this.framesBetweenShots = 5;
	this.frameCount = 0;	// frames since last shot fired
	this.collidableWith = ["obstacle", "objective"];
	this.collidedWith = "";
	this.type = "ship";

	this.image = imageRepository.ship;

	this.draw = function(){
		this.context.drawImage(this.image, Math.round(this.x), Math.round(this.y));
	};
	
	this.move = function(){
		// determine if the ship must be moved:
		if(KEY_STATUS.up || KEY_STATUS.right || KEY_STATUS.down || KEY_STATUS.left){
			// if so, use a dirty rectangle to remove the ship:
			this.context.clearRect(this.x, this.y, this.width, this.height);
			// then modify the ship's position accordingly:
			if(KEY_STATUS.up && this.y > this.canvasHeight*2/3 ){
				this.y -= this.speed;
			}
			if(KEY_STATUS.right && this.x < this.canvasWidth - this.width*3/2 - this.speed){
				this.x += this.speed;
				this.direction = 'right';
			}
			if(KEY_STATUS.left && this.x > this.width/2 + this.speed){
				this.x -= this.speed;
				this.direction = 'left';
			}
			if(KEY_STATUS.down && this.y < this.canvasHeight - this.height - this.speed){
				this.y += this.speed;
			}

			if(this.isAlive)
				this.draw();
		} else {
			this.context.clearRect(this.x, this.y, this.image.width, this.image.height);
			if(this.isAlive)
				this.draw();
		}
	};
}
Ship.prototype = new Drawable();

function Pool(type, maxSize) {
	var type = type;
	this.size = maxSize;
	var pool = [];

	this.init = function(){
		for(var i = 0; i < this.size; i++){
			switch(type){
				case "object":
					var paddingX = 8;
					var paddingY = 5;
					var asteroidSpeed = 2;
					var startX = 0;
					var startY = 0;
					pool[i] = new Collidable();
					pool[i].init(0, 0, 0, 0, game.mainCanvas);
					pool[i].collidableWith = "ship";
					break;
			}
		}
	};

	this.drawElements = function(){
		for(var i = 0; i < this.size; i++){
			if(pool[i].inUse && !pool[i].draw()){
				pool[i].clear();
				var object = pool[i];
				pool.splice(i, 1);
				pool.push(object);
			}
		}
	};

	// see if the object at the end is available to use. if so,
	// start using it, and put it in the front of the array
	this.getOne = function(x, y, speed, type){
		if(!pool[this.size - 1].inUse){
			for(var i = 0; i<this.size && pool[i].inUse; i++){
				if(y > pool[i].y - 80 && y < pool[i].y + 80){
					console.log("starting y: "+y + "\tstarting x: "+x);
					y = pool[i].y - 80;
					if(x > pool[i].x - 80 && x < pool[i].x + 80){
						x = pool[i].x - 80;
					}
					console.log("new y: "+y + "\tnew x: "+x);
					break;
				}				
			}
			if(x >= 0){
				var o = pool.pop();
				o.width = imageRepository[type].width;
				o.height = imageRepository[type].height;
				o.spawn(x, y, speed, type);
				pool.unshift(o);
			}
		} else {
			console.log("Ran out of available objects!");
		}
	}

	this.print = function(){
		var str = "[";
		for(var i = 0; i < size; i++){
			str += (pool[i].inUse ? "t" :"f");
			if(i < size -1) str += ", ";
		}
		console.log(str + "]");
	}

	this.getPool = function() {
		var obj = [];
			
		for (var i = 0; i < this.size; i++) {
			if (pool[i].inUse) {
				obj.push(pool[i]);
			}
		}
		return obj;
	}

}


/**
 * QuadTree object.
 *
 * The quadrant indexes are numbered as below:
 *     |
 *  1  |  0
 * ----+----
 *  2  |  3
 *     |
 */
function QuadTree(boundBox, lvl){
	var maxObjects = 10;
	var maxLevel = 5;
	var level = lvl || 0;
	
	this.bounds = boundBox || {
		x: 0, y: 0, width: 0, height: 0
	};

	var objects = [];
	this.nodes = [];
	
	/*
	* Clears the quadTree and all nodes of objects
	*/
	this.clear = function(){
		objects = [];

		for(var n = 0; n < this.nodes.length; n++){
			this.nodes[n].clear();
		}

		this.nodes = [];
	};

	this.getAllObjects = function(returnedObjects){
		for(var n = 0; n < this.nodes.length; n++){
			this.nodes[n].getAllObjects(returnedObjects);
		}

		for(var o = 0; o < objects.length; o++){
			returnedObjects.push(objects[o]);
		}

		return returnedObjects;
	};

	this.findObjects = function(returnedObjects, obj){
		if (typeof obj === "undefined") {
			console.log("UNDEFINED OBJECT");
			return;
		}

		var index = this.getNodeIndex(obj);
		if (index != -1 && this.nodes.length) {
			this.nodes[index].findObjects(returnedObjects, obj);
		}

		for (var i = 0, len = objects.length; i < len; i++) {
			returnedObjects.push(objects[i]);
		}

		return returnedObjects;	
	};

	/*
	* Determine which node the object belongs to. -1 means
	* object cannot completely fit within a node and is part
	* of the current node
	*/
	this.getNodeIndex = function(object){
		var index = -1;
		var verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    	var horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
	
		var belongsToTopHalf = object.y + object.height < verticalMidpoint && object.y < verticalMidpoint;
		var belongsToBottomHalf = object.y > verticalMidpoint;
		var belongsToLeftHalf = object.x + object.width < horizontalMidpoint && object.x < horizontalMidpoint;
		var belongsToRightHalf = object.x > horizontalMidpoint;

		if(belongsToTopHalf){
			if(belongsToRightHalf)
				index = 0;
			else if(belongsToLeftHalf)
				index = 1;
		} else if(belongsToBottomHalf){
			if(belongsToLeftHalf)
				index = 2;
			else if(belongsToRightHalf)
				index = 3;
		}

		return index;
	};


	this.split = function(){
		var subWidth = (this.bounds.width / 2) | 0;
		var subHeight = (this.bounds.height / 2) | 0;

		this.nodes[0] = new QuadTree({
				x: this.x + subWidth, y: this.y, width: subWidth, height: subHeight
			}, this.level++);
		this.nodes[1] = new QuadTree({
				x: this.x, y: this.y, width: subWidth, height: subHeight
			}, this.level++);
		this.nodes[2] = new QuadTree({
				x: this.x, y: this.y + subHeight, width: subWidth, height: subHeight
			}, this.level++);
		this.nodes[3] = new QuadTree({
				x: this.x + subWidth, y: this.y + subHeight, width: subWidth, height: subHeight
			}, this.level++);
	};


	/*
	* Insert the object into the quadTree. If the tree
	* excedes the capacity, it will split and add all
	* objects to their corresponding nodes.
	*/
	this.insert = function(object){
		if(typeof object == 'undefined')
			return;

		// alows an entire array of objects to be added to the 
		// quad tree:
		if(object instanceof Array){
			for(var i=0; i<object.length; i++){
				this.insert(object[i]);
			}
			return;
		}

		// if the current node has already been split:
		if(this.nodes.length){
			var index = this.getNodeIndex(object);
			// if an individual object has been received,
			// insert that object into a subnode if it can fit
			// entirely within one:
			if(index != -1){
				this.nodes[index].insert(object);
				return;
			}
		}
		objects.push(object);

		// Prevent infinite splitting:
		if(objects.length > maxObjects && level < maxLevel){
			if(this.nodes[0] == null){
				this.split();
			}
			
			var i = 0;
			while(i < objects.length){
				var index = this.getNodeIndex(objects[i]);
				if(index != -1){
					this.nodes[index].insert((objects.splice(i, 1))[0]);
				} else {
					i++;
				}
			}
		}

	};
}

/**
 * A sound pool to use for the sound effects
 */
function SoundPool(maxSize) {
	var size = maxSize; // Max sounds allowed in the pool
	var pool = [];
	this.pool = pool;
	var currSound = 0;

	/*
	* Populates the pool array with the given sound
	*/
	this.init = function(object) {
		if (object == "ufo") {
			for (var i = 0; i < size; i++) {
				// Initalize the sound
				var ufo = new Audio("sounds/ufo.mp3");
				ufo.volume = .12;
				ufo.load();
				pool[i] = ufo;
			}
		}
/*		else if (object == "explosion") {
			for (var i = 0; i < size; i++) {
				var explosion = new Audio("sounds/explosion.mp3");
				explosion.volume = .1;
				explosion.load();
				pool[i] = explosion;
			}
		}
*/	};

	/*
	* Plays a sound
	*/
	this.play = function() {
		if(pool[currSound].currentTime == 0 || pool[currSound].ended) {
			pool[currSound].play();
		}
		currSound = (currSound + 1) % size;
	};
}


function Game() {
	this.init = function() {
		this.playerScore = 0;

		this.bgCanvas = document.getElementById('background');
		this.shipCanvas = document.getElementById('ship');
		this.mainCanvas = document.getElementById('main');


		// initialize background:
		this.background = new Background();
		this.background.init(0, 0, imageRepository.background.width, imageRepository.background.height, this.bgCanvas);

		// initialize player ship:
		this.ship = new Ship();
		var shipStartY = Math.floor(this.bgCanvas.height - 3/2 * imageRepository.ship.height) + 1;
		var shipStartX = Math.floor((this.bgCanvas.width - imageRepository.ship.width) / 2) + 1;
		this.ship.init(shipStartX, shipStartY, imageRepository.ship.width, imageRepository.ship.height, this.shipCanvas);

		// initialize object pool:
		this.asteroidPool = new Pool("object", 18);
		this.asteroidPool.init();

		// Start QuadTree
		this.quadTree = new QuadTree({
			x: 0, y: 0, width: this.mainCanvas.width, height: this.mainCanvas.height
		});

		//*******************//
		// initialize sound: //
		//*******************//

		// play this sound when ufo is captured:
		this.ufo = new SoundPool(4);
		this.ufo.init("ufo");

		// background loop, played when in-game:
		this.backgroundAudio = new Audio("sounds/theme.mp3");
		this.backgroundAudio.loop = true;
		this.backgroundAudio.volume = .25;
		this.backgroundAudio.load();

		// game over loop, played at end of game:
		this.gameOverAudio = new Audio("sounds/game-over.mp3");
		this.gameOverAudio.loop = true;
		this.gameOverAudio.volume = .25;
		this.gameOverAudio.load();

		this.checkAudio = window.setInterval(function(){checkReadyState()},1000);
	};

	this.start = function() {
		this.ship.draw();
		this.backgroundAudio.play();
		animate();
	};

	this.endGame = function(){
		this.backgroundAudio.pause();
		this.backgroundAudio.currentTime = 0;
		this.gameOverAudio.play();
		this.gameOverAudio.currentTime = 0;
		document.getElementById('game-over').style.display = "block";
	};

	this.restart = function() {
		console.log("Restarting Game");
		this.gameOverAudio.pause();
		this.gameOverAudio.currentTime = 0;

		document.getElementById('game-over').style.display = "none";
		var bgContext = this.bgCanvas.getContext("2d");
		bgContext.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
		var shipContext = this.shipCanvas.getContext("2d");
		shipContext.clearRect(0, 0, this.shipCanvas.width, this.shipCanvas.height);
		var mainContext = this.mainCanvas.getContext("2d");
		mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

		this.quadTree.clear();

		this.background.init(0, 0, imageRepository.background.width, imageRepository.background.height, this.bgCanvas);

		var shipStartY = Math.floor(this.bgCanvas.height - 3/2 * imageRepository.ship.height) + 1;
		var shipStartX = Math.floor((this.bgCanvas.width - imageRepository.ship.width) / 2) + 1;
		this.ship.init(shipStartX, shipStartY, imageRepository.ship.width, imageRepository.ship.height, this.shipCanvas);

		this.asteroidPool.init();

		this.playerScore = 0;

		this.backgroundAudio.currentTime = 0;
		this.backgroundAudio.play();

		this.start();
	};
}

function init() {
	this.game = new Game();
	game.init();
}

function detectCollision() {
	objects = [];
	game.quadTree.getAllObjects(objects);

	for (var x = 0, len = objects.length; x < len; x++) {   
		game.quadTree.findObjects(obj = [], objects[x]);
		for (y = 0, length = obj.length; y < length; y++) {
			// DETECT COLLISION ALGORITHM
			if (objects[x].collidableWith === obj[y].type 
				&& (objects[x].x < obj[y].x + obj[y].width 
					&& objects[x].x + objects[x].width  > obj[y].x 
					&& objects[x].y < obj[y].y + obj[y].height 
					&& objects[x].y + objects[x].height > obj[y].y)) {
						objects[x].isColliding = true;
						objects[x].collidedWith = obj[y].type;
						obj[y].isColliding = true;
						obj[y].collidedWith = objects[x].type;
			}
		}
	}
}

function checkReadyState() {
	if (game.backgroundAudio.readyState === 4) {
		console.log("Audio Loaded");
		window.clearInterval(game.checkAudio);
		game.start();
	}
}

function animate() {
	game.quadTree.clear();
	game.quadTree.insert(game.ship);
	game.quadTree.insert(game.asteroidPool.getPool());

	detectCollision();

	document.getElementById('score').innerHTML = game.playerScore;
	requestAnimationFrame(animate);
	game.background.draw();
	game.ship.move();

	game.asteroidPool.drawElements();
	if(Math.random() < 0.03){
		var collidableType = (Math.random() > 0.5) ? "obstacle" : "objective";
		var xPos = Math.floor(Math.random() * (600-imageRepository[collidableType].width));
		game.asteroidPool.getOne(xPos, 0, 2, collidableType);
	}
}

var KEY_CODES = {
	37: 'left',
	38: 'up',
	39: 'right',
	40: 'down',
};

var KEY_STATUS = {};
for (code in KEY_CODES) {
	KEY_STATUS[ KEY_CODES[ code ]] = false;
}

document.onkeydown = function(event) {
	// Firefox and opera use charCode instead of keyCode to
	// return which key was pressed.
	var keyCode = (event.keyCode) ? event.keyCode : event.charCode;
	if (KEY_CODES[keyCode]) {
		event.preventDefault();
		KEY_STATUS[KEY_CODES[keyCode]] = true;
	}
};

document.onkeyup = function(event) {
	var keyCode = (event.keyCode) ? event.keyCode : event.charCode;
	if (KEY_CODES[keyCode]) {
		event.preventDefault();
		KEY_STATUS[KEY_CODES[keyCode]] = false;
	}
};

// Request Animation Frame Poly:
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

function displayGreeting(){
	$('#wrapper').click(function(){
		$('#greeting').hide();
		init();
	})
}