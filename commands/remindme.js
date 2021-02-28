module.exports = {
    name: "remindme",
    description: "Reminds User about due dates for assignments",
    execute(msg, args) {
        if (msg.content.startsWith("!remindme", 0)) {
            var splitInput = msg.content.split(' ', 6)
            var assignmentName = splitInput.slice(1,2)
            console.log(assignmentName.length)
            if(assignmentName.length === 0){
                msg.channel.send("Invalid Command, Please run the command \'!remindme help\'")
            }
            else{
                var dueMonth = splitInput.slice(2,3)
                var dueDay = splitInput.slice(3,4)
                var dueYear = splitInput.slice(4,5)
                var specificAt = splitInput.slice(5,6)
                if (specificAt.toString() === "user") {
                    var atString = ` ${msg.author} Reminder set for ` 
                } else if(specificAt.toString() === "everyone") {
                    atString = "@everyone"
                }
                console.log(atString)
                if (assignmentName.includes('help')) {
                    msg.channel.send(
                        "How to Use this Command: \n" +
                        "Example Command: !remindme assignmentName dueDate specific@ \n" +
                        "Example Assignmen tName: csHomework2 \n" +
                        "Example Due Date: July 4 1776 \n" +
                        "specific@: user or everyone"
                    )
                } else { 
                    msg.channel.send(atString + " Reminder set for " + assignmentName + ' on ' + dueMonth + ' ' + dueDay + ' ' + dueYear);
                    var timeStart = Date.now()
                    var timeEnd = new Date((dueMonth + " " + dueDay + " " + dueYear + " 23:59").toString())
                    var timeDif = timeEnd - timeStart
                    console.log(timeStart)
                    console.log(timeEnd - 1)
                    console.log(timeDif)
                    var hasRun = true
                    
    
                    var intervalID = setInterval(() => {
    
                        if(hasRun){
                            msg.channel.send(atString + ' ' + assignmentName + ' is due Tonight!')
                            clearInterval(intervalID)
                        }
                    }, (timeDif - 43200000)) //Math.abs(seconds)
    
    
                }
            }
        }
    }
}