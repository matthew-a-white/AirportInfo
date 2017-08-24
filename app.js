//FIRST INSTRUCTION AND COOKIES
$(function() {          //equivalent to $(document).ready(function() {
    if(Cookies.get('getInstructions') == 'yes' || Cookies.get('getInstructions') === undefined) {
        $("#dialogContentText").css("visibility", "visible");
        $("#dialog").dialog({
            resizable: true,
            height: 'auto',
            width: 500,
            modal: false,
            draggable: true,
            open: function (event, ui) {
                $('#dialog').css('overflow', 'hidden'); //for no scrollbar
            },
            dialogClass: "instructions success-dialog",
            buttons: {
            "Yes": function() {
              $(this).dialog("close");
              Cookies.set('getInstructions', 'yes');
            },
            "No": function() {
              $(this).dialog("close");
              Cookies.set('getInstructions', 'no');
            }
            }
        });
    }
 });

//QUICK SETUP OF INPUT
$(function() {
    $("#inputBox").keyup(function(event) {
        if(event.keyCode == 13) {
            $("#button").click();
        }
    });
});

//FOR EASY ACCESS TO INPUT
$(function() {
    if(Cookies.get('getInstructions') ==='no')
        $("#inputBox").select();
});

//START OF CHOOSING AIRPORT
var inputID, removeTable = false;

function getID() {
    inputID = document.getElementsByName("input")[0].value;
    inputID = inputID.trim();

    if(removeTable) {
        tbl.remove();
        tblBody.remove();
    }
    main(inputID);
}

//END OF CHOOSING AIRPORT

//START SETUP OF VARIABLES AND FILES
var data, allAirports, waiting;
var waitTimes = ["No wait", "1-10 min", "11-20 min", "21-30 min", "31+ min"];
var checkpointNames = [];
var checkpointsCovered = [];
var waitTimesIndices = [];
var updateWaitTimes = [];
var utcTime; //used for putting update times in the airport's local time
var precheck; //for displaying whether precheck is available

var xhttp = new XMLHttpRequest();
xhttp.open("GET", "apcp.xml", false); //false makes it not asynchronous
xhttp.send();
allAirports = xhttp.responseXML;
//END FIRST SETUP

//BUG FIX (getID() was executed twice after pressing enter when first inputting an airport code that has no data or is wrong)
var alertNormal = false;

function alertCallback(message, callback) {
    alert(message);
    callback();
}

//START AIRPORT NAME (this section was moved up here so that even with no data, the airport name will be displayed)
function getAirport(id) {
    id = id.toUpperCase();

    var airportList = allAirports.getElementsByTagName("airport");
        var airportName;
        for(var i = 0; i < airportList.length; i++) {
            if(airportList[i].childNodes[1].innerHTML == id) {
                airportName = airportList[i].childNodes[0].innerHTML;
                $("#airport").html(airportName);
                utcTime = airportList[i].childNodes[6].innerHTML;
                precheck = airportList[i].childNodes[8].innerHTML;
                if(precheck === "true")
                    $("#precheckNote").html("Precheck is available at this airport");
                else
                    $("#precheckNote").html("Precheck is not available at this airport");

                for(var j = 0; j < airportList[i].getElementsByTagName("checkpoints")[0].getElementsByTagName("checkpoint").length; j++) {
                    checkpointNames.push(airportList[i].getElementsByTagName("checkpoints")[0].getElementsByTagName("checkpoint")[j].childNodes[1].innerHTML);
                }
            }
        }

    if(airportName === undefined) {
        alertCallback("Please enter a valid airport code", function() {
            $("#inputBox").blur();
        });
        $("#airport").html("");
        $("#note").html("");
        $("#precheckNote").html("");
        return false;
    }
    return true;
}
//END AIRPORT NAME

//START SETUP OF VARIABLES AND FILES
function ajaxRequest(id) {
    var url = "http://apps.tsa.dhs.gov/MyTSAWebService/GetWaitTimes.ashx?ap=" + id;
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from html where url="' + url + '"') + '&format=xml';

    $.ajax({
        type: "GET",
        url: url,
        async: false,
        success: function(text){
            data = text;
        },
        error: function(){
            alert("Error with YQL");
        },
        dataType: "text"
    });

    $("#note").html("Note: order of checkpoints comes from update time in the airport's local time");

    if(data.length < 310) {
        alertCallback("NO DATA AVAILABLE", function() {
            $("#inputBox").blur();
        });
        $("#note").html("");
    }

    var firstConvertIndex = data.indexOf("documentelement");
    var secondConvertIndex = data.indexOf("documentelement", firstConvertIndex + 1);
    data = data.substring(firstConvertIndex - 1, secondConvertIndex + 16);
    waiting = jQuery.parseXML(data);
    waiting = waiting.getElementsByTagName("documentelement")[0].getElementsByTagName("waittimes");
}
//END SETUP OF VARIABLES AND FILES

//START CREATING FUNCTIONS TO ORGANIZE CODE
var body, tbl, tblBody;

function createTable(checkpoints, waitingTimes, updateTimes, changes) {
    removeTable = true;
    body = document.getElementsByTagName('body')[0];
    tbl = document.createElement("table");
    tblBody = document.createElement("tbody");

    if(checkpoints.length > 0) {
        removeTable = true;
    }

    for(var i = 0; i < checkpoints.length + 1; i++) {
        var row = document.createElement("tr");

        for (var j = 0; j < 4; j++) {
            var cell, cellText;
            if(i == 0) {
                cell = document.createElement("th");
            } else {
                cell = document.createElement("td");
            }

            if(i == 0 && j == 0) {
                cellText = document.createTextNode("Checkpoint name");
            } else if(i == 0 && j == 1) {
                cellText = document.createTextNode("Waiting times");
            } else if(i == 0 && j == 2) {
                cellText = document.createTextNode("Last TSA update");
            } else if(i == 0) {
                cellText = document.createTextNode("Changing wait times");
            } else if(j == 0) {
                cellText = document.createTextNode(checkpoints[i - 1]);
            } else if(j == 1) {
                cellText = document.createTextNode(waitingTimes[i - 1]);
            } else if(j == 2) {
                cellText = document.createTextNode(updateTimes[i - 1]);
            } else {
                cellText = document.createTextNode(changes[i - 1]);
            }

            cell.appendChild(cellText);
            row.appendChild(cell);
        }
        // add the row to the end of the table body
        tblBody.appendChild(row);
    }
    // put the <tbody> in the <table>
    tbl.appendChild(tblBody);
    // appends <table> into <body>
    body.appendChild(tbl);
    // sets the border attribute of tbl to 2;
    tbl.setAttribute("border", "1");
}

function isChanging(originalChecks, originalTimes, extraChecks, extraTimes) {
    var finalChanging = [];
    for(var i = 0; i < originalChecks.length; i++) {
        if(extraChecks.indexOf(originalChecks[i]) == -1) {
            finalChanging.push("Unknown");
        }

        for(var j = 0; j < extraChecks.length; j++) {
            if(originalChecks[i] == extraChecks[j]) {
                if(extraTimes[j] > originalTimes[i])
                    finalChanging.push("Decreasing");
                else if(extraTimes[j] < originalTimes[i])
                    finalChanging.push("Increasing");
                else
                    finalChanging.push("Not changing");
            }
        }
    }
    return finalChanging;
}
//END CREATING FUNCTIONS TO ORGANIZE CODE

//START GETTING DATA
var compiledDataCheck = [], compiledDataWait = [];
var unknownWait, indexOfUnknown = -1, counter = 0; //for unknown checkpoints
var compiledExtraChecks = [], extraWaitIndices = [];
var unparsedUpdate, tIndex, endUpdateIndex, date, specificTime, specificHourString, specificHourInt, timeChange, utcTimeInt;  //for update times section of table

function compileData() {
    for(var i = 0; i < waiting.length; i++) {  //waiting is list of all WaitTimes nodes
        if(compiledExtraChecks.indexOf(waiting[i].childNodes[0].innerHTML) < 0) {
            if(checkpointsCovered.indexOf(waiting[i].childNodes[0].innerHTML) > -1) {
                compiledExtraChecks.push(waiting[i].childNodes[0].innerHTML);
                extraWaitIndices.push(waiting[i].childNodes[1].innerHTML);
            }
        }

        if(checkpointsCovered.indexOf(waiting[i].childNodes[0].innerHTML) < 0 && waiting[i].childNodes[0].innerHTML != 0) {
            checkpointsCovered.push(waiting[i].childNodes[0].innerHTML);
            waitTimesIndices.push(waiting[i].childNodes[1].innerHTML);
            counter++;

            //FOR FINDING THE DATE
            unparsedUpdate = waiting[i].childNodes[2].innerHTML;
            tIndex = unparsedUpdate.indexOf("T");
            endUpdateIndex = unparsedUpdate.indexOf("-04:00");
            date = unparsedUpdate.substring(0, tIndex);
            specificTime = unparsedUpdate.substring(tIndex + 3, endUpdateIndex);
            specificHourString = unparsedUpdate.substring(tIndex + 1, tIndex + 3);
            specificHourInt = parseInt(specificHourString);
            utcTimeInt = parseInt(utcTime);
            timeChange = utcTimeInt + 5;
            specificHourInt += timeChange;
            if(specificHourInt < 0)
                specificHourInt = 24 + specificHourInt;
            specificHourString = "" + specificHourInt;
            updateWaitTimes.push(date + " at " + specificHourString + specificTime);
        } else if(indexOfUnknown == -1 && waiting[i].childNodes[0].innerHTML == 0) {
            checkpointsCovered.push("0");
            waitTimesIndices.push(waiting[i].childNodes[1].innerHTML);
            indexOfUnknown = counter;
            unknownWait = waiting[i].childNodes[1].innerHTML;

            //FOR FINDING THE DATE
            unparsedUpdate = waiting[i].childNodes[2].innerHTML;
            tIndex = unparsedUpdate.indexOf("T");
            endUpdateIndex = unparsedUpdate.indexOf("-04:00");
            date = unparsedUpdate.substring(0, tIndex);
            specificTime = unparsedUpdate.substring(tIndex + 3, endUpdateIndex);
            specificHourString = unparsedUpdate.substring(tIndex + 1, tIndex + 3);
            specificHourInt = parseInt(specificHourString);
            utcTimeInt = parseInt(utcTime);
            timeChange = utcTimeInt + 5;
            specificHourInt += timeChange;
            if(specificHourInt < 0)
                specificHourInt = 24 + specificHourInt;
            specificHourString = "" + specificHourInt;
            updateWaitTimes.push(date + " at " + specificHourString + specificTime);
        }
    }

    for(var i = 0; i < checkpointsCovered.length; i++) {
        if(i == indexOfUnknown) {
            compiledDataCheck.push("Unknown checkpoint");
            compiledDataWait.push(waitTimes[unknownWait - 1]);
        }

        if(checkpointsCovered[i] != 0) {
            compiledDataCheck.push(checkpointNames[checkpointsCovered[i] - 1]);
            compiledDataWait.push(waitTimes[waitTimesIndices[i] - 1]);
        }
    }

    var changingTimes = isChanging(checkpointsCovered, waitTimesIndices, compiledExtraChecks, extraWaitIndices);

    createTable(compiledDataCheck, compiledDataWait, updateWaitTimes, changingTimes);

    var tableHeight = tbl.offsetHeight;
    var notePositionTop = tableHeight + 175;
    $("#note").css("top", notePositionTop);
}
//END GETTING DATA

//QUICK RESET FUNCTION
function removeData() {
    checkpointsCovered = [], waitTimesIndices = [], compiledExtraChecks = [], extraWaitIndices = [], compiledDataCheck = [], compiledDataWait = [], updateWaitTimes = [], changingTimes = [], checkpointNames = []; //reset arrays

    inputID = null, unknownWait = 0, indexOfUnknown = -1, counter = 0, unparsedUpdate = "", tIndex = -1, endUpdateIndex = -1, date = "", specificTime = "", utcTime = "", specificHourString = "", specificHourInt = null, timeChange = null, utcTimeInt = null;  //reset variables
}

//COMPILATION OF FUNCTIONS
function main(id) {
    if(getAirport(id)) {
        try {
            ajaxRequest(id);
        } catch (err) {
            console.log("The error is: \n" + err);
            removeData();
            return; //return is just to keep errors from showing up in console due to waiting.length in compileData()
        }
        compileData();
    }
    removeData();
    alertNormal = true;
}