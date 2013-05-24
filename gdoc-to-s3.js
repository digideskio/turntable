var $   = require('jquery'),
  AWS   = require('aws-sdk');

// AWS.config.loadFromPath('/path/to/credentials.json');
// var s3 = new AWS.S3();

/* ------------------------ */
/*    SET UP ACCOUNT INFO   */
/*      AND FILE SCHEMA     */
/* ------------------------ */
var CONFIG = {
  bucket: '',
  key: '0Aoev8mClJKw_dFFEUHZLV1UzQmloaHRMdHIzeXVGZFE',
  output_schema: ['name','color'], // These are the columns to carry over into your csv on S3
  output_path: 'tests/',
  file_name: 'names.csv'
};

function fetchGDoc(key){
  $.ajax({
    url: 'https://docs.google.com/spreadsheet/pub?key=' + key + '&output=csv',
    success:function(response){

      var timestamp      = getFormattedISOTimeStamp();
      var header_columns = response.split('\n')[0].split(',');

      var status        = 'Fetch successful: ' + timestamp;
      reportStatus(status);

      var json          = csvToJSON(response);
      var sanitized_csv = sanitizeData(json);
      console.log(sanitized_csv)

      uploadToS3(sanitized_csv, timestamp);

    },
    error: function(err){
      console.log(err);
      var timestamp = getFormattedISOTimeStamp();
      var status    = 'Ajax error: ' + timestamp;
      reportStatus(status);
    }
  })
}

function reportStatus(text){
    console.log(text);
}

function arraysEqual(arr1, arr2) {
  if(arr1.length !== arr2.length){
    return false;
  }
  for(var i = arr1.length; i--;) {
    if(arr1[i] !== arr2[i]){
      return false;
    }
  }
  return true;
}

function sanitizeData(json){
  var csv = CONFIG.output_schema.join(',') + '\n';
  for (var i = 0; i < json.length; i++){
    var row = [];
    for (var q = 0; q < CONFIG.output_schema.length; q++){
      row.push(json[i][CONFIG.output_schema[q]])
    }
    if (i < json.length - 1){
      csv += row.join(',') + '\n';
    }else{
      csv += row.join(',');
    }
  }

  return csv;
}

function csvToJSON(response){
  var json = [];
  var rows = response.split('\n');
  var columns = rows[0].split(',');
  // Skip the first row because it's the header row
  for (var i = 1; i < rows.length; i++){
    var obj = {};
    var vals = rows[i].split(',');
    for (var q = 0; q < vals.length; q++){
      obj[columns[q]] = vals[q];
    }
    json.push(obj);
  }
  return json;
}

function uploadToS3(sanitized_csv, timestamp){
  uploadToS3_backup(sanitized_csv, timestamp);
  uploadToS3_live(sanitized_csv, timestamp);
}

function uploadToS3_backup(sanitized_csv, timestamp){
  var data = {
    Bucket: CONFIG.bucket,
    Key: CONFIG.output_path + 'backups/' + timestamp + CONFIG.file_name,
    Body: sanitized_csv
  };
  s3.client.putObject( data , function (resp) {
    if (resp == null){
      var status = 'Backup upload successful: ' + timestamp;
      reportStatus(status);
    };
  });
}

function uploadToS3_live(sanitized_csv, timestamp){
  var data = {
    Bucket: CONFIG.bucket,
    Key: CONFIG.output_path + CONFIG.file_name,
    Body: sanitized_csv
  };
  s3.client.putObject( data , function (resp) {
    if (resp == null){
      var status = 'Live file overwrite successful: ' + timestamp;
      reportStatus(status);
    };
  });
}

function getFormattedISOTimeStamp(){
  // Format the time a bit more readable by replacing colons, getting rid of the Z
  // and adding an underscore at the end to separate it from the file_name
  return new Date().toISOString().replace(/:/g,'_').replace('Z','') + '_';
}
fetchGDoc(CONFIG.key);