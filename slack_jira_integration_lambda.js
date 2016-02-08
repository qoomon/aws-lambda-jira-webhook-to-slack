var url = require('url');
var https = require('https');

var slackWebHookUrl = "https://hooks.slack.com/services/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";

exports.handler = function(webhook, context) {
    console.log(JSON.stringify(webhook,2,2));

    var userSelfUrl = url.parse(webhook.user.self);
    webhook.user.url= userSelfUrl.protocol + "//" +userSelfUrl.hostname + "/secure/ViewProfile.jspa?key=" + webhook.user.key;
    var issueSelfUrl = url.parse(webhook.issue.self);
    webhook.issue.url= issueSelfUrl.protocol + "//" +issueSelfUrl.hostname + "/browse/" + webhook.issue.key;
    var projectSelfUrl = url.parse(webhook.issue.fields.project.self);
    webhook.issue.fields.project.url= projectSelfUrl.protocol + "//" +projectSelfUrl.hostname + "/browse/" + webhook.issue.fields.project.key;
    
    var eventString = webhook.webhookEvent;
    var eventColor = '#ffffff';

    // https://developer.atlassian.com/static/connect/docs/latest/modules/common/webhook.html
    if(webhook.webhookEvent == "jira:issue_created"){
        eventString = "created";  
        eventColor = '#4a6785';
    }
    if(webhook.webhookEvent == "jira:issue_updated"){
        eventString = "updated"; 
        if(webhook.issue.fields.status.statusCategory.key == "new") {
            eventColor = '#4a6785';
        }
        if(webhook.issue.fields.status.statusCategory.key == "indeterminate") {
            eventColor = '#ffd351';
        }
        if(webhook.issue.fields.status.statusCategory.key == "done") {
            eventColor = '#14892c';
        }
    }
    if(webhook.webhookEvent == "jira:issue_deleted"){
        eventString = "deleted"; 
        eventColor = '#cc0000';
    }
    if(webhook.webhookEvent == "jira:worklog_updated"){
        eventString = "updated";
        eventColor = '#999999';
    }
    
    var slackRequestContent = {};
    slackRequestContent.text = "*<" + webhook.user.url + "|" + webhook.user.displayName + ">* " + eventString + " <" + webhook.issue.url + "|" + webhook.issue.key + ">   (<" + webhook.issue.fields.project.url + "|" + webhook.issue.fields.project.name + ">)";
    
    slackRequestContent.attachments= [];

    var attachment = {
      "color": eventColor,
      "title": webhook.issue.fields.summary,
      "title_link": webhook.issue.url,
    };
    
    attachment.fields = [];
    if(webhook.changelog && webhook.changelog.items) {
        webhook.changelog.items.forEach(function(item){
            var excludeFields = [1, 2, "bar"];
            if(!excludeFields.includes(item.field)){
                var field = {
                  "title": item.field,
                  "value": item.toString || "-",
                  "short": false
                };
                attachment.fields.push(field);
            }
        });
    }
    if(webhook.comment) {
        var comment = {
          "title": "Comment",
          "value": webhook.comment.body,
          "short": false
        };
        attachment.fields.push(comment);
    }
    slackRequestContent.attachments.push(attachment);
    
    var slackRequestUrl = url.parse(slackWebHookUrl);
    var slackRequestOptions = {
        host: slackRequestUrl.host,
        port: slackRequestUrl.port || '443',
        path: slackRequestUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
    };
    var slackRequest = https.request(slackRequestOptions, function(response){
        var data = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            data += chunk;
        });

        response.on('end', function () {
            if(200 <= response.statusCode && response.statusCode < 300){
                context.succeed(response.statusCode + " => " + data);
            } else {
                 context.fail(response.statusCode + " => " + data);
            }
        });

    });
    slackRequest.on('error', context.fail);
    console.log(JSON.stringify(slackRequestContent,2,2));
    slackRequest.write(JSON.stringify(slackRequestContent));
    slackRequest.end();
};
