
var debug = false;
/*update video list*/
socket.on('updateVlist',function(data){
	$('#video_list').empty();
	
	$.each(data, function(key,value) {
		$('#video_list').append('<li></li>');

		$.ajax({
			type: "GET",
			url: "http://gdata.youtube.com/feeds/api/videos/"+value.vid+"?v=2&alt=jsonc",
			dataType: "jsonp",
			success: function (response, textStatus, XMLHttpRequest) {
		
				var img   = response.data.thumbnail.sqDefault,
					title = response.data.title,
					c     = key+1;

				$('#video_list li:nth-child('+c+')').append("<a href='#' class='thumbnail'>"+
					'<img src="'+img+'" />'+
					'<p>'+title+'</p></a>');
				}
				
			});
	});
	
});

/*
 * Youtube Player API
 *  
 */

//Load player api asynchronously.
var tag = document.createElement('script');
tag.src = "http://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var vid_data = null,
	player   = false;

var load_player = function onYouTubePlayerAPIReady(vid) {
		
}

function onPlayerStateChange(event) {
	
	switch(event.data){
	case 0:
		break;
	case 1:
		interval = window.setInterval(function(){
			$('#video_slider').slider('value', (player.getCurrentTime()/vid_data.duration*100));
		},500);
		break;
	case 2:
		window.clearInterval(interval); //clear interval
		break;
	case 3:
		
		break;
	case 5:
		//player.playVideo();
		break;
	}
}


socket.on('changeClientVideoState', function(data) {
	switch(data.state){
	//playing
	case 1:
		player.playVideo();
		break;
	//paused
	case 2:
		player.pauseVideo();
		break;
	//buffering
	case 3:
		pause();
		break;
	case 6:
		player.seekTo( data.val, false);
	default:
		//console.log("error player state…lol");
	}
});



socket.on('updatePlayer',function(vid){

	if(debug)
		console.log("[YOUTUBE DEBUG]: socket on updatePlayer: "+vid);
	if(vid!=null){
		//load video
		if(!player){
			$("#loading_msg").text("Loading Video Player…");
			
			//onYouTubePlayerAPIReady(vid);
			player = new YT.Player('youtubePlayer', {
				  height: '390',
				  width: '710',
				  videoId: vid,
				  playerVars: {
				          start: 10,
				          controls  : 0,
				          rel       : 0,
				          wmode		: "opaque"
				           },
				  events: {
						'onReady': function(event) {
							//play();
							if(debug)
								console.log("[YOUTUBE DEBUG]: Player onReady:! vid=" + vid);
							$("#loading_msg").text("Done").parent().parent().remove();
							
												
						},
						'onStateChange': onPlayerStateChange
		          	}
				});
			
		}else{
			player.loadVideoById(vid);
		}

		//get video meta data
		$.ajax({
			type: "GET",
			url: "http://gdata.youtube.com/feeds/api/videos/"+vid+"?v=2&alt=jsonc",
			dataType: "jsonp",
			success: function (response, textStatus, XMLHttpRequest) {
				if(debug)
					console.log("[DEBUG]: video ajax response: "+response);
				var data = response.data;
				$("#current_vid").text(vid);
				if(data.accessControl.embed!="allowed"){
					// If the video was not found, or embedding is not allowed;
					return false;
				}
				vid_data = data;

			}
		});
		//pause();
	}
});

$(document).ready(function(){

	 //hover show up video control
	$('#viedo_control_warp').hover(function(){
			$("#video_control").animate({ bottom: 0},150,function(){
				$("#video_control").addClass("controlShow");
			});
		}, function(){
			$("#video_control").removeClass("controlShow").animate({ bottom: "-40px"},150,function(){
			
			});
	});
	$('#start').click(function () {
		socket.emit('changeVideoState', {state:1,val:0});
	});
	$('#stop').click(function () {
		socket.emit('changeVideoState', {state:5,val:0});
	});
	$('#pause').click(function () {
		socket.emit('changeVideoState', {state:2,val:0});
	});
	$('#video_slider').slider({
		min: 0,
		range: "min",
		max: 100,
		slide: function(event, ui) {
			socket.emit('changeVideoState', {state:6,val:((ui.value/100)*vid_data.duration)});
			
			//player.seekTo( (ui.value/100)*vid_data.duration, false);
		},
	});
	$('#volume').slider( {
		orientation: "vertical",
		range: "min",
		min: 0,
		max: 100,
		value: 60,
		slide: function(event, ui) {
			player.setVolume(ui.value);
		}
	});
	//change volume
	$("#volumeChange").hover(function(){
		$("#volumeChange").css("overflow","visible");
		$("#volume").animate({ opacity: 1},160);
	},function(){
		$("#volumeChange").css("overflow","hidden");
		$("#volume").animate({ opacity: 0},160);
	});
	
	
	//suggest buttom popover
	$('#suggest').popover(
    {
       // title: $("#title").html(),
        content: $("#content").html(),
        placement: "bottom",
        trigger: 'manual',
        template: '<div id="suggestion_box" class="popover"><div class="arrow"></div><div class="popover-inner"><div class="popover-content"><p></p></div></div></div>'
        
    }).click(function(evt){
    	evt.stopPropagation();
   		$(this).popover('toggle');
   		
   		//show collapse for the suggestion
   		if($(this).hasClass('suggest_close')){
        	$(this).removeClass('suggest_close').addClass('suggest_open');
        	
        	
        	//if we open suggestion window, show the collpase jquery
        	new jQueryCollapse($(".popover-content #collapse_option"), {
        		query: "h4",
        		accordion: true,
				show: function() {
					this.slideDown(200);

					if(this.attr('id') == "suggest_related_video"){
						loadRelatedVideos(this);					
					}else if(this.attr('id')=="playlist_history"){
						loadPlaylistHistory(this);
					}
				},
				hide: function() {
					this.slideUp(200);
				},
			});
        }else{
        	$(this).removeClass('suggest_open').addClass('suggest_close');
        }


   		//prevent popover from hiding if click from inside
   		$("#suggestion_box").on('click',function(evt) {
            evt.stopPropagation();
    	});
    });
    
    $("html").click(function(event){
    	//make sure to remove class suggest_open
    	$('#suggest').popover('hide').removeClass('suggest_open').addClass('suggest_close');
    });
    
 
    //when click enter, push the video to the playlist
	$('#suggest_video').keypress(function(e) {
		if(e.which == 13) {		
			var newVideo=$("#suggest_video").val();
			newVideo = filterLinkParameter('v',newVideo);
			$("#suggest_video").val("");
			socket.emit('addNewVideo',newVideo);
		}
	});
    
});
function loadRelatedVideos($obj){
	$obj.empty().append("<img id='vid-ajax-loader' src='/include/ajax-loader.gif'/>");
		var current_vid = $("#current_vid").text();
		//show related videos
		$.ajax({
			type: "GET",
			url: "http://gdata.youtube.com/feeds/api/videos/"+current_vid+"/related?v=2&alt=jsonc",
			dataType: "jsonp",
			success: function (response, textStatus, XMLHttpRequest) {
				$obj.empty();
				$.each(response.data.items, function(key,val){
						var img   = val.thumbnail.sqDefault,
							title = val.title,
							id    = val.id,
							newDiv = "<li id='"+id+"' onClick='ClickinsertVideo(this.id,event)'><a href='#' class='add_video thumbnail'>"+'<img src="'+img+'" />'+'<p>'+title+'</p></a></li>';
							
						$obj.append(newDiv);
						$(newDiv).on("click", function(event){
							alert($(this).text());
						});
				
				});

			}
		});

}
function loadPlaylistHistory($obj){
	$obj.empty().append("<img id='vid-ajax-loader' src='/include/ajax-loader.gif'/>");
	var room_id = $("#rooms").text();
	$.ajax({
		type: "GET",
		url: "/api/room/"+room_id+"/playlist",
		dataType: "json",
		success: function (response, textStatus, XMLHttpRequest) {
			$obj.empty();
			if(response.length === 0){
				$obj.append("<p>The playlist is empty</p>");
			}else{
				console.log(response);
				$.each(response, function(key,value) {
					$obj.append('<li onClick="ClickinsertVideo(this.id,event)"></li>');
					console.log(value);
					$.ajax({
						type: "GET",
						url: "http://gdata.youtube.com/feeds/api/videos/"+value.vid+"?v=2&alt=jsonc",
						dataType: "jsonp",
						success: function (response, textStatus, XMLHttpRequest) {
					
							var img   = response.data.thumbnail.sqDefault,
								title = response.data.title,
								c     = key+1;
				
							$obj.find('li:nth-child('+c+')').append("<a href='#' class='add_video thumbnail'>"+
								'<img src="'+img+'" />'+
								'<p>'+title+'</p></a>').attr("id",value.vid);
							}
							
						});
				});
				
			}

		}
	});
}

function ClickinsertVideo(id,event){
	if(debug){
		console.log("DEBUG: add new video after click: " +id);
		
	}
	var answer = confirm('Add this video??');
	if(answer)
	{
		socket.emit('addNewVideo',id);
	}
	
}
function insertVideo(string,e){
	if(e.which == 13) {		
		string =string.replace(/<(?:.|\n)*?>/gm, '');
		newVideo = filterLinkParameter('v',string);
			if(newVideo){
				//makesure the video is valid
				$.ajax({
					type: "GET",
					url: "http://gdata.youtube.com/feeds/api/videos/"+newVideo+"?v=2&alt=jsonc",
					dataType: "jsonp",
					success: function (response, textStatus, XMLHttpRequest) {
						if(response.data === undefined){
							// If the video was not found, or embedding is not allowed;
							alert("invalid video!");
							return false;
						}
						if(response.data.accessControl.embed!="allowed")
						{
							alert("can't embed this video!");
							return false;
						}
						socket.emit('addNewVideo',newVideo);
					}
				});
				
			}
			//make sure to remove class
			$('#suggest').popover('toggle').removeClass('suggest_open').addClass('suggest_close');
		}
}
//Prase and get link parameter
function filterLinkParameter( name ,url )
{
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec(url);
	if( results == null ){
		return "";
	}
	return results[1];
}
