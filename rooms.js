/**
 * Individual room in Nodevid
 * @Class Room
 * @constructor
 */
function Room (newRoomID, tokbox_session_id) {
	this.id   = newRoomID;
    this.name = newRoomID;
    this.members = {}; 
    var password;
    this.videoPlayList = [];
    this.vlistSize =0;
    this.videoLog = [];
    this.chatLog   = [];
    this.maxSize  =4;
    this.tok_sessionId = tokbox_session_id;
    this.tok_token =null;

    //default room video
    this.currentVideo = "6WyW0-myR84";
}

// @Change the name of the room
Room.prototype.changeName = function(newName){
	this.name = newName;
}

// @Set a password for the room
Room.prototype.setPassword = function(pass){
	this.password = pass;
}

/*
 * user methods
 */
 
// @check if a user is already in the room
Room.prototype.memberExists = function(sessionID){
	return (typeof this.members[sessionID] != 'undefined');
}

// @check if room is full
Room.prototype.isFull = function(){
	return (Object.size(this.members) == this.maxSize);
}

// @add a new user to the room
// return true if the member is added, false if the room is full
Room.prototype.addMember = function(sessionID, name) {
	//maximum of 4 members in a room
	if(Object.size(this.members) < this.maxSize)
	{
		//just in case
		name =name.replace(/<(?:.|\n)*?>/gm, '');
		this.members[sessionID]= {username: name, socketCount: 1};
		
		return true;
	}else
	{
		return false;
	}
};

Room.prototype.addMemberSocket = function(sessionID){
	
	this.members[sessionID]["socketCount"] ++;

}

// @remove a user
Room.prototype.removeMember = function(sessionID) {

	this.members[sessionID]["socketCount"]--;
	if(this.members[sessionID]["socketCount"] == 0){
	    delete this.members[sessionID];
	  }
};

// @returns true if the room contains no users
Room.prototype.isEmpty = function(){
	return Object.size(this.members)==0;
}

/*
 * Video methods
 */

// @add a video to the play list
Room.prototype.pushVideo = function(name,vid) {
	//just in case
	vid =vid.replace(/<(?:.|\n)*?>/gm, '');
	this.vlistSize++;
    this.videoPlayList.push({name: name,vid: vid});
};

// @remove the video from the playlist, add it to the videolog, return the video
Room.prototype.popVideo = function() {
	var v= this.videoPlayList.shift();
	this.vlistSize--;
	//put in video history
	this.videoLog.push(v);
	this.currentVideo = v.vid;
	return v.vid;
};


/*
 * chat methods
 */
 
// @update the chat log. Pair the message with the user 
Room.prototype.updateChat = function(name, msg){
	this.chatLog.push({name: name,message: msg});
}

// @return the chat log
Room.prototype.getChatLog = function(){
	return this.chatLog;
}

Room.prototype.getVideoLog = function(){
	return this.videoLog;
}


/*
 * Nodevid Class - contains video rooms
 *
 */
function Nodevid(){
	this.rooms = {};
	this.userSession = {};
}
//rooms 
Nodevid.prototype.roomExists = function (roomID){
	return (typeof this.rooms[roomID] != 'undefined');
}
Nodevid.prototype.addRoom = function (data, callback){

	this.rooms[data.roomID] = new Room(data.roomID,data.tb_session_id);
	callback();
}
Nodevid.prototype.removeRoom = function (roomID){
	delete this.rooms[roomID];
}
Nodevid.prototype.getRoom = function(roomID){
	if(this.roomExists(roomID))
		return this.rooms[roomID];
	else
		return false;
}
Nodevid.prototype.totalRooms = function(){
	return Object.size(this.rooms);
}
Nodevid.prototype.removeEmptyRoom = function(){
	for (var roomID in this.rooms){
		if(this.rooms[roomID].isEmpty()){
			this.removeRoom(roomID);
		}
    }
}

//session
Nodevid.prototype.addSession = function (sessionID)
{
	if(typeof(this.userSession[sessionID]) == 'undefined')
		this.userSession[sessionID] = {sessionID: sessionID};
}
Nodevid.prototype.addSessionName = function (sessionID,name)
{
	this.userSession[sessionID].username = name;
}

Nodevid.prototype.getSessionName = function (sessionID)
{
	if (typeof(this.userSession[sessionID].username) == "undefined")
		return false;
	return this.userSession[sessionID].username;
}


//self defined functions
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

//export room class
exports.createGlobal = function(){
	return new Nodevid();
}