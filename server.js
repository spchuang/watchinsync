var DEBUG = true;
var PORT  = 8080;
var server_url = "54.243.230.91:"+PORT;
var API_KEY = '15079881';
var API_SECRET = '88bef80ee8c70ebce1a26f146443a575e7e14bbc';


var rooms = require('./rooms.js').createGlobal()
  , cookie = require('cookie')
  , express = require('express')
  , app = express.createServer();
  //, MongoClient = require('mongodb');
 // , opentok = require('opentok');
  
// create a single instance of opentok sdk.
//var ot = new opentok.OpenTokSDK(API_KEY, API_SECRET);


//Configuration
app.configure(function () {
    app.use(express.cookieParser());
    app.use(express.session({secret: 'secret', key: 'express.sid'}));
});


/*                   */
/* Variables         */
/*                   */
var currentRoomID;
var currentRoom;

/*                   */
/* ROUTING FUNCTIONS */
/*                   */
app.get('/', function (req, res){
	
	res.sendfile(__dirname + '/home.html');
	
});

//create room url
app.get('/createRoom',function(req,res){
		//Check if room already exists
		
	do{
		newRoomID = Math.floor(Math.random()*100000);
	}while(rooms.roomExists(newRoomID));
	
	if(DEBUG)
			console.log("[DEBUG]: CREATE ROOM "+ newRoomID);
	//start tokbox session
	/*ot.createSession(server_url,{}, function(sessionID) {
		rooms.addRoom({roomID:newRoomID, tb_session_id: sessionID}, function(){		
		//	socket.emit('goToRoom', newRoomID);
			var testRoom = rooms.getRoom(newRoomID);
			testRoom.a = "10";
			
			console.log((rooms.getRoom(newRoomID)));
			res.redirect('/room/'+newRoomID);
		});
				
	});*/
	rooms.addRoom({roomID:newRoomID, tb_session_id: 2}, function(){		
		//	socket.emit('goToRoom', newRoomID);
			var testRoom = rooms.getRoom(newRoomID);
			testRoom.a = "10";
			
			console.log((rooms.getRoom(newRoomID)));
			res.redirect('/room/'+newRoomID);
		});

});

//get room playlist history
app.get('/api/room/:id/playlist',function(req,res){
		
	if(DEBUG)
		console.log("[DEBUG]: GET ROOM PLAYLIST "+ req.params.room);
	res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        });
    var r = rooms.getRoom(req.params.id);
    if(!r)
    	res.end(JSON.stringify({"error": "room doesn't exists"}));
    else
    	res.end(JSON.stringify(r.videoLog));

});
app.get('/rooms', function(req,res){



});
app.get('/room/:id', function (req, res) { 
	if(DEBUG)
		console.log("[DEBUG]: ROOMS INFO\n"+rooms);
	//check if room exists, if not load home page
	if(rooms.roomExists(req.params.id) && !rooms.getRoom(req.params.id).isFull()){
		
		currentRoomID = req.params.id;
		res.sendfile(__dirname + '/room.html');
	}else{
		res.redirect('/');
	}
});


//static file
app.get('/include/:file',function(req,res){
	res.sendfile(__dirname +"/include/"+req.params.file);
});

app.get('*', function(req,res){

});


//delete rooms 
/*
(function deleteRoom() {
	setTimeout( deleteRoom, 60000000);
	if(DEBUG)
		console.log("[DEBUG]: Start removing rooms!");
    rooms.removeEmptyRoom();
  
})();*/

app.listen(PORT);
//establish socket io
var io  = require('socket.io').listen(app);

//set debug level
if(DEBUG)
	io.set('log level',3);
else
	io.set('log level', 0);
	
process.on('uncaughtException', function(err) {
    console.log("[DEBUG]: Uncaught exception!", err);
});

// GET SESSION FROM COOKIE
io.set('authorization', function (data, accept) {
	if(DEBUG)
 			console.log("[DEBUG]: CHECKING COOKIES");
	if (!data.headers.cookie) 
    	return accept('No cookie transmitted.', false);

 	data.cookie = cookie.parse(data.headers.cookie);
 	//every socket is bound to the session ID
 	data.sessionID = data.cookie['express.sid'];
 	rooms.addSession(data.sessionID);
	return accept(null, true);
	
 }).sockets.on('connection', function (socket) {
 	if(DEBUG){
 		console.log("[DEBUG]: SOCKET ON CONNECTION");
 	
 		console.log("[DEBUG]: CURRENT ROOM "+currentRoomID);
 	}
	
	/*
	 * Set the user socket to not in room
	 */
	socket.on('setNotInRoom', function(){
		socket.inroom=false;
	});
	
	/*
	 * Room Function
	 *  
	 */
	socket.on('joinRoom', function()
	{
		//if the person already joined the room
		if(DEBUG)
 			console.log("[DEBUG]: JOIN ROOM");
		if(!rooms.roomExists(currentRoomID)){
			socket.emit("goToHome"); 
			return false; 
		}
		if(rooms.getRoom(currentRoomID).memberExists(socket.handshake.sessionID)){
			if(DEBUG)
 				console.log("[DEBUG]: OLD USER ADDED");
 			
			//if the username is valid and doesn't exist yet
			socket.room     = currentRoomID;
			currentRoom     = rooms.getRoom(socket.room);
			
			//increment socket count for the user
			currentRoom.addMemberSocket(socket.handshake.sessionID);
			
			//socket join the room
			socket.inroom = true;
			socket.join(socket.room);
	
			//emitting, updating
			socket.emit('updateChat','SERVER','you have connected');
			socket.emit('updateUsers', currentRoom.members);
			socket.emit('updateRooms', socket.room);
			//update video list
			if(currentRoom.vlistSize>0){		
				socket.emit('updateVlist',currentRoom.videoPlayList);
			}
			socket.emit("updatePlayer",currentRoom.currentVideo);
		}else  
		{
			//no session name stored yet
			username =rooms.getSessionName(socket.handshake.sessionID);
		
			socket.emit('enterUser',username);
		}
	});
	
	socket.on('addUser',function(username,fn){
		if(DEBUG)
 			console.log("[DEBUG]: ADD NEW USER. NAME: "+username);
		if(!rooms.roomExists(currentRoomID)){
			socket.emit("goToHome"); 
			return false; 
		}
		
		//tell user to reenter name if there is an error
		if(!username){
			fn(false, {err:"Name can't be empty!"});	
			return false;	
		}
		
		//prevent scripting attack
		username =username.replace(/<(?:.|\n)*?>/gm, '');
		
		fn(true,{});
		/*else if(!isValidUserSyntax(username)){
			socket.emit('reenterUser', 'Please input a name without symbols and spaces');		
		}*/
		
		//if the username is valid and doesn't exist yet
		socket.room     = currentRoomID;
		currentRoom     = rooms.getRoom(socket.room);
		
		//start tokbox token for each user
		/*currentRoom.tok_token = ot.generateToken({
				'sessionId': currentRoom.tok_sessionId,
				'role': "publisher"
				});
		*/
		//add member
		currentRoom.addMember(socket.handshake.sessionID,username);
		rooms.addSessionName(socket.handshake.sessionID, username);
		
		//socket join the room
		socket.inroom = true;
		socket.join(socket.room);

		//emitting, updating
		socket.emit('updateChat','SERVER','you have connected');
		
		//update video list
		if(currentRoom.vlistSize>0){		
			socket.emit('updateVlist',currentRoom.videoPlayList);
		}
		
		socket.broadcast.to(socket.room).emit('updateChat', 'SERVER', username +' has connected');
		io.sockets.in(socket.room).emit('updateUsers', currentRoom.members);
		io.sockets.in(socket.room).emit('updateRooms', socket.room);
		socket.emit("updatePlayer",currentRoom.currentVideo);
		
		
	});
	
	socket.on('sendChat',function(message){
		
		if(!rooms.roomExists(currentRoomID)){
			if(DEBUG)
 				console.log("[DEBUG]: SOCKET CONNECT TO INVALID ROOM");
			socket.emit("goToHome"); 
			return false; 
		}
		//prevent scripting attack
		message =message.replace(/<(?:.|\n)*?>/gm, '');
		//update the messages
		io.sockets.in(socket.room).emit('updateChat',rooms.getSessionName(socket.handshake.sessionID),message);
	});
	
	socket.on('disconnect', function(){
		if(socket.inroom == true){
			//get the name first before it's destroyed
			username = rooms.getSessionName(socket.handshake.sessionID);
			//remove member (or socket count)
			currentRoom.removeMember(socket.handshake.sessionID);

			//if member is no longer in the room
			if(!currentRoom.memberExists(socket.handshake.sessionID)){
				
				
				//console.log(currentRoom);
				//if room isn't empty
				if(!currentRoom.isEmpty())
				{
					io.sockets.in(socket.room).emit('updateUsers',currentRoom.members);
					socket.broadcast.to(socket.room).emit('updateChat', 'SERVER',
											username +' has left the room');
				}
			}	

			socket.inroom = false;
			socket.leave(socket.room);
		}
	});
	
	/*                          */
  	/*     TokBox functions     */
  	/*                          */
	/*socket.on('startTok', function(){
		if(DEBUG)
			console.log("[DEBUG]: STARTTOK, SOCKET ROOM: " +socket.room);
		currentRoom     = rooms.getRoom(socket.room);
		socket.emit('updateChat','SERVER','you have started Video Chat');
		socket.broadcast.to(socket.room).emit('updateChat','SERVER',rooms.getSessionName(socket.handshake.sessionID)+ '  started Video Chat');
		socket.emit('startTok', API_KEY, currentRoom.tok_sessionId, currentRoom.tok_token); 
				
	});
	socket.on('removeTok', function(){
		socket.emit('updateChat','SERVER','you have closed Video Chat');
		socket.broadcast.to(socket.room).emit('updateChat','SERVER',rooms.getSessionName(socket.handshake.sessionID)+ '  closed Video Chat');

	
	});*/
    /*
	 * Video Function
	 *  
	 */
	socket.on('addNewVideo',function(vid){
		currentRoom  = rooms.getRoom(socket.room);
		currentRoom.pushVideo(rooms.getSessionName(socket.handshake.sessionID), vid);
		io.sockets.in(socket.room).emit('updateVlist',currentRoom.videoPlayList);
		
	}); 
	/*socket.on('removeVideo',function(){
		currentRoom  = rooms.getRoom(socket.room);
		currentRoom.popVideo();

		//remove null elements
		//videos[socket.room] = new Array();for (k in videos[socket.room]) if(videos[socket.room][k]) newArr.push(videos[socket.room][k]) 
		//console.log(videos[socket.room].length+ " : "+videos[socket.room]);
		io.sockets.in(socket.room).emit('updateVlist',currentRoom.videoPlayList);
	});*/

	socket.on('changeVideoState', function(data){
		username =rooms.getSessionName(socket.handshake.sessionID);
	/*
	 * Player state
	 * state: 0 unactivated
	 * state: 1 playing
	 * state: 2 paused
	 * state: 5 stopped
	 */
	 	
	 	if(data.state == 5){
	 		currentRoom  = rooms.getRoom(socket.room);
	 		//if the playlist is not empty
	 		if(currentRoom.vlistSize>0){	
		 		var vid = currentRoom.popVideo();
		 		io.sockets.in(socket.room).emit('updatePlayer',vid);	
		 		io.sockets.in(socket.room).emit('updateVlist',currentRoom.videoPlayList);
		 		io.sockets.in(socket.room).emit('updateChat',"SERVER",username+" skipped to new video!");
		 	}else{
		 		io.sockets.in(socket.room).emit('updateChat',"SERVER","Playlist is empty!");
		 	}
		 	
		 	
	 	}else{

	 		io.sockets.in(socket.room).emit('changeClientVideoState',data);
	 		
	 		if(data.state == 1)
	 			io.sockets.in(socket.room).emit('updateChat',"SERVER",username+" played the video!");
	 		else if(data.state == 2)
	 			io.sockets.in(socket.room).emit('updateChat',"SERVER",username+" paused the video!");
	 		
			else if(data.state == 6)
				io.sockets.in(socket.room).emit('updateChat',"SERVER",username+" changed video time!");

		}
	});

});


//checks for valid syntax in username
function hashCode(string){
	var hash = 0;
	if (string.length == 0) return hash;
	for (i = 0; i < string.length; i++) {
		char = string.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash.toString(36);
}
