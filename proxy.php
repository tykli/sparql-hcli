<?php 
//set POST variables
$url = $_POST['url'];
unset($_POST['url']);
$fields_string = "";
//url-ify the data for the POST
foreach($_POST as $key=>$value) {
	$fields_string .= $key.'='.$value.'&';
}

$fields_string = rtrim($fields_string,'&');
//open connection

die(print_r(http_build_query($_POST)));
$ch = curl_init();
//set the url, number of POST vars, POST data
curl_setopt($ch,CURLOPT_URL, $url);
curl_setopt($ch,CURLOPT_POST,count($_POST));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch,CURLOPT_POSTFIELDS,http_build_query($_POST));
curl_setopt($ch,CURLOPT_HTTPHEADER,array (
		"Accept: application/sparql-results+xml, */*;q=0.5"
));

//execute post
$result = curl_exec($ch);
$ct = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
//close connection
curl_close($ch);

if(stristr($ct, "xml")){
	header("Content-type: text/xml; charset=utf-8");
} else if(stristr($ct, "html")) {
	header("Content-type: text/html; charset=utf-8");
	header('HTTP/1.1 500 Internal Server Error');
}else{
	header("Content-type: text/plain; charset=utf-8");
	header('HTTP/1.1 500 Internal Server Error');
}

echo $result;
?>