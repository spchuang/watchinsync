//var url="ec2-23-22-145-103.compute-1.amazonaws.com:8080";
var url = "http://www.watchinsync.com:8080/";

//tokbox variables
var session, publisher;
var dimensions ={ width: 200,
		height: 150};
//4:3

 
var socket= io.connect(url,{
  'reconnect': true,
  'reconnection delay': 500,
  'max reconnection attempts': 10
});


//make connection
socket.on('connect', function(){
	socket.emit('joinRoom');
	$("#loading_msg").text("Entering User...");
	
});
/*socket.on('startTok', function(apiKey, tok_sessionId, tok_token){
	session = TB.initSession(tok_sessionId);
	session.addEventListener('sessionConnected', sessionConnectedHandler);
	session.addEventListener('streamCreated', streamCreatedHandler);	
	session.connect(apiKey, tok_token);
});*/

socket.on('enterUser', function(username){
	if(username == false)
		addUser("What's your name?");
	else
		socket.emit('addUser', username,function (set){
		
			console.log("[CONNECT DEBUG] 2:" + set);
		});
		
});
function addUser(promptMsg){
	socket.emit('addUser', prompt(promptMsg),function (set, msg){
		//if error, readd the user...
		if(!set){
			addUser(msg.err);
		}else{
			$("#loading_msg").text("Loading Room Information...");
		}
		console.log("[CONNECT DEBUG] 1:" + set);
	});

}

socket.on('goToHome', function(){
	window.location = "/";
});	

 
//update chat box
socket.on('updateChat', function(username, data){
	//need to change to prevent javascript injection
	$("#conversation").append('<li><b>'+username+':</b> '+data+'<br></li>');
	var myDiv = $("#conversation");
	myDiv.animate({ scrollTop: myDiv.prop("scrollHeight")}, 100);
});
//update room number
socket.on('updateRooms',function(currentRoomID){
	$('#rooms').html(currentRoomID);
});
//when more users join, update user list
socket.on('updateUsers', function(membersList){
	$('#users').empty();
	$.each(membersList, function(key, value) {
  		$('#users').append('<li class="active">'+value.username+'</li>');
	})
});

//functions for tokbox event handler and subscribing
/*function sessionConnectedHandler(event) {
	console.log("[DEBUG]: CREATED Publish");
	$("#ajax-loader").remove();
	publisher = session.publish('user', dimensions);
	subscribeToStreams(event.streams);
}

function streamCreatedHandler(event) {
	console.log("[DEBUG]: CREATED HANDLE SESSION");
	$("#ajax-loader").remove();
	subscribeToStreams(event.streams);
}

function subscribeToStreams(streams) {
	for (var i = 0; i < streams.length; i++) {
		// Make sure we don't subscribe to ourself
		if (streams[i].connection.connectionId == session.connection.connectionId) {
			return;
		}

		// Create the div to put the subscriber element in to
		var div = document.createElement('div');
		div.setAttribute('id', 'stream' + streams[i].streamId);
		console.log("[DEBUG]: subscribe to Stream");
		$('#user_wrap').append(div);
		// Subscribe to the stream
		session.subscribe(streams[i], div.id, dimensions);
	}
}
  */
//when the page loads
$(document).ready(function(){
	var link= url+window.location.pathname;;
	//$("#link").val(link);
	//console.log(link);
	
	// Update chat when press enter
	$('#data').keypress(function(e) {
		if(e.which == 13) {		
			var message=$("#data").val();
			$("#data").val("");	
			socket.emit('sendChat',message);
		}
	});   
	
	$("#start_vchat").click(function(){
		if($(this).hasClass("vchat_closed")){
			$('body').append('<div id="users_wrap"><div id = "user_wrap"><div id="user"></div></div></div>').
				each(function(){
					$(this).find("#users_wrap").fadeTo(100,1).append("<img id='ajax-loader' src='/include/ajax-loader.gif'/>");
					$("#users_wrap").draggable();
					TB.setLogLevel(TB.DEBUG);
					socket.emit('startTok');
				});
		
			$(this).removeClass("vchat_closed").addClass("vacht_started").find('h3').text("Close Video Chat");
		}else{
			$('#users_wrap').remove();
			socket.emit('removeTok');
			$(this).removeClass("vacht_started").addClass("vchat_closed").find('h3').text("Start Video Chat");
		}
		
	});	
	
	$('a[href$="#share"]').popover(
    {
        content: '<input id="link" class="span4" style="margin: 5px 7px;" type="text" value="'+link+'" readonly="readonly" onClick="window.prompt ("Copy to clipboard: Ctrl+C, Enter", text);"/>',
        placement: "bottom",

        
    });
    
	
});


  
