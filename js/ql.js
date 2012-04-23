//url of the page that proxy the requests
var proxyPageUrl = "proxy.php";
	
/*
 * 
 */	
var editor;


$(document).ready(function() {
	editor = CodeMirror.fromTextArea(document.getElementById("sparqlQuery"), {
		mode : "application/x-sparql-query",
		tabMode : "indent",
		matchBrackets : true,
		lineNumbers : true
	});

	displaySessionList(listSessions());

	$('input[name="gc"]').hide();
	$('input[name="custom"]').on('change', function() {
		$('select[name="g"]').toggle();
		$('input[name="gc"]').toggle();
	});

	$('#saveBtn').on('click', function() {
		var index = saveSession();
		displaySessionList(listSessions(), index);
	});
	
	$('#prefixesBtn').on('click', function() {
		var i = $(this).children('i');
		if(i.hasClass("icon-chevron-right")){
			i.removeClass("icon-chevron-right").addClass("icon-chevron-down");
		} else{
			i.removeClass("icon-chevron-down").addClass("icon-chevron-right");
		}
	});
	
	

	$('#sessionQueries').on('change', function() {
		var s = loadSession($(this).val());
		if (s != null) {
			displaySession(s);
		}

	});

	$('#queryFull').on("click", function() {
		var queryBody = editor.getValue();
		executeQuery(queryBody);

	});

	$('#querySelected').on("click", function() {
		var queryBody = editor.getSelection();
		if (queryBody == null || queryBody.length == 0) {
			alert("No text selected");
			return;
		}
		executeQuery(queryBody);
	});

	$('querySave').on("click", function() {
		alert("Not yet implemented");
	});
});

function saveSession() {
	var session = new Object();
	session.name = $('#sessionName').val();
	session.query = editor.getValue();
	session.endpoint = getEndpointUrl();
	session.prefixes = new Array();

	$('input[name="prefix"]:checked').each(function() {
		session.prefixes.push($(this).val());
	});

	var sessionJson = JSON.stringify(session);

	// create if not exists, replace if exists

	var index = null;

	var sessions = listSessions();
	$.each(sessions, function(i, v) {
		if (v.name == session.name) {
			index = i;
		}
	});

	if (index == null) {
		var index = localStorage['*ql.ses.count'];
		index = index == null ? 0 : parseInt(index) + 1;
		localStorage['*ql.ses.' + index] = sessionJson;
		localStorage['*ql.ses.count'] = index;
	} else {
		localStorage['*ql.ses.' + index] = sessionJson;
	}

	return index;
}

function loadSession(index) {
	if (index < 0) {
		return null;
	}
	// load from db
	var sessionJson = localStorage['*ql.ses.' + index];
	var session = JSON.parse(sessionJson);
	return session;
}

function displaySession(session) {
	editor.setValue(session.query);

	var ck = $('input[name="custom"]');
	if (ck.prop('checked') != true) {
		ck.prop("checked", true).trigger('change');
	}

	$('input[name="gc"]').val(session.endpoint);
	$.each($('input[name="prefix"]'), function(i, v) {
		var val = $(this).val();
		if ($.inArray(val, session.prefixes) >= 0) {
			$(this).prop("checked", true);
		} else {
			$(this).prop("checked", false);
		}
	});
}

function displaySessionList(sessions, selected) {
	var sessionList = $('#sessionQueries').empty();
	sessionList.append($('<option></option>').attr('value', '-1').text("---").prop('selected', true));
	$.each(sessions, function(i, v) {
		var opt = $("<option></option>").attr("value", i).text(v.name);
		if (selected != undefined && selected == i) {
			opt.prop('selected', true);
		}
		sessionList.append(opt);
	});
}

function listSessions() {
	var index = localStorage['*ql.ses.count'];
	index = index == null ? -1 : index;
	var sessions = new Array();
	for ( var i = 0; i <= index; i++) {
		var session = loadSession(i);
		sessions.push(session);
	}
	return sessions;

}

function getEndpointUrl() {
	var endpoint = "";
	if ($('input[name="custom"]').is(":checked")) {
		endpoint = $('input[name="gc"]').val();
	} else {
		endpoint = $("#endpoints").find('option:selected').val();
	}
	return endpoint;
}

function executeQuery(queryString) {
	var endpoint = getEndpointUrl();
	// get selected endpoint
	if ($('input[name="custom"]').is(":checked")) {
		endpoint = $('input[name="gc"]').val();
	} else {
		endpoint = $("#endpoints").find('option:selected').val();
	}

	var prefixes = "";
	$('input[name="prefix"]:checked').each(function() {
		prefixes = prefixes + $(this).val() + "\n";
	});

	// reset stopwatch
	var stopWatch = new Date().getTime();
	var timer = $.timer(1000, function(){
		var elapsed = new Date().getTime() - stopWatch;
		$('#sw').text("running..."+Math.round(elapsed / 1000) + "s");
	});
	

	// run query
	var xhr = $.ajax({
		url : proxyPageUrl,
		type : 'POST',
		dataType : "text",
		data : {
			url : endpoint,
			query : prefixes + queryString,
		},
		beforeSend:function(jqXHR, settings){
			// clerar result and error
			$("#resultBox").empty();
			$('.msg').empty();
			$('#resultContainer').addClass("hidden");
			$('#sw').text("");
			$('#swr').text("");
			// start timer
		}
	});

	// on complete stop the stopwatch
	xhr.always(function() {
		// stop timer
		timer.stop();
		var elapsed = new Date().getTime() - stopWatch;
		$('#sw').text("(" + (elapsed / 1000) + "s) ").after("rendering...");
		
	});

	// build result table
	xhr.done(function(data) {
		
		$('#resultContainer').removeClass("hidden");
		var ct = xhr.getResponseHeader("Content-Type");
		var table = $("#resultBox");
		var c = 0;
		
		if (ct.indexOf('xml') >= 0) {
			$('#sw').after("");
			var xml = $.parseXML(data);

			var tr = $('<tr></tr>');
			$(xml).find("variable").each(function(i, v) {
				tr.append($('<th></th>').text($(this).attr('name')));
			});
			table.append($('<thead></thead>').append(tr));

			var tb = $('<tbody></tbody>');
			$(xml).find("result").each(function(i, bind) {
				tr = $('<tr></tr>');
				$(bind).find('binding').each(function(i, v) {
					var val = $(this).get(0);
					val = $(val).children(0).text();
					console.log(val);
					tr.append($('<td></td>').text(val));
				});
				tb.append(tr);
				c = c + 1;
			});
			table.append(tb);
			$('#swr').text(c);
		} else if (ct.indexOf('html') >= 0) {
			displayError("Error", data,true);
		} else {
			displayError("Error", data);
		}
	});
	

	// display error messagge on result
	xhr.fail(function(jqXHR, textStatus) {
		displayError(jqXHR.status, jqXHR.responseText);
	});
	
	

	// show error messagge
	function displayError(status, message, html) {
		
		var mbody =$('<pre class="alert-error"></pre>').text(message);
		if(html != undefined && html == true){
			mbody =$('<div></div>').html(message);
		}
		
		var title = $('<h4></h4>').text(status);
		var m = $('<div class="alert alert-error"></div>')
		.append($('<a class="close" data-dismiss="alert">×</a>'))
		.append(title)
		.append(mbody);
		$('.msg').append(m);
	}
}