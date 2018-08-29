console.log('Loading');

const region = process.env.REGION || 'ap-northeast-1';
const token = process.env.TOKEN;
const channel = process.env.CHANNEL || '#random';
if (!token) {
  throw new Error('slack token needed.');
}

const request = require('request');
const moment = require('moment');
const aws = require('aws-sdk');
const s3 = new aws.S3({apiVersion: '2006-03-01', region: region});

function postCallback(err, httpResponse, body) {
  if (err) {
    console.error('failed:', err);
  } else {
    console.log('success. response:', body);
  }
}
function postInfoUpload(comment, content) {
  return {
    url: 'https://slack.com/api/files.upload',
    formData: {
      token: token,
      channels: channel,
      title: 'sns.json',
      initial_comment: comment,
      content: content,
      filename: 'sns.json',
      filetype: 'javascript'
    }
  };
};
function postInfoMessage(text) {
  return  {
    url: 'https://slack.com/api/chat.postMessage',
    formData: {
      token: token,
      channel: channel,
      text: text
    }
  };
};

function notifyBounce(data) {
  var message = `Bounce: Type:${data.bounce.bounceType},${data.bounce.bounceSubType} by ${data.bounce.reportingMTA}(${data.bounce.remoteMtaIp}) at ${data.bounce.timestamp}\n`;
  data.bounce.bouncedRecipients.forEach(recipient => {
    message += `　To:"${recipient.emailAddress}" ${recipient.action} ${recipient.status} "${recipient.diagnosticCode}"\n`;
  });
  message += `　Subject:"${data.mail.commonHeaders.subject}"\n　From:${data.mail.commonHeaders.from} => To:${data.mail.destination.join(',')}`;
  request.post(postInfoMessage(message), postCallback);
};
function notifyComplaint(data) {
  var message = `Complaint: Type:${data.complaint.complaintFeedbackType} by "${data.complaint.userAgent}" at ${data.complaint.timestamp}\n`;
  message += '　To:';
  data.complaint.complainedRecipients.forEach(recipient => {
    message += ` "${recipient.emailAddress}"`;
  });
  message += `\n　Subject:"${data.mail.commonHeaders.subject}"\n　From:${data.mail.commonHeaders.from} => To:${data.mail.destination.join(',')}`;
  request.post(postInfoMessage(message), postCallback);
};
function notifyReceived(data) {
  var message = `Received: Subject:"${data.mail.commonHeaders.subject}"\n　From:${data.mail.commonHeaders.from} => To:${data.mail.destination.join(',')}\n`;

  var bucket = data.receipt.action.bucketName;
  var prefix = data.receipt.action.objectKeyPrefix;
  var key = data.receipt.action.objectKey;
  var tokey = `${prefix}${moment().format("YYYY/MMDD/HHmmss_")}${key.replace(prefix, '')}.eml`;
  var copied = false;
  var copyPromise = s3.copyObject({ CopySource: `${bucket}/${key}`, Bucket: bucket, Key: tokey }).promise();
  var deletePromise = s3.deleteObject({ Bucket: bucket, Key: key }).promise();
  
  copyPromise.then(x => {
    data.receipt.action.objectKey = tokey;
    return deletePromise;
  }).catch(e => {
    request.post(postInfoMessage(`S3 error: ${e}`), postCallback);
  }).then(x => {
    message += `　File: https://s3.console.aws.amazon.com/s3/object/${data.receipt.action.bucketName}/${data.receipt.action.objectKey}?region=${region}&tab=overview`;
    request.post(postInfoMessage(message), postCallback);
  });
};

exports.handler = function(event, context) {
  if (!event.Records) {
    return;
  }
  event.Records.forEach(record => {
    if (!record.Sns) {
      return;
    }
    var messageJson = false;
    try {
      if (!record.Sns.Message) {
        throw new Error('Sns.Message IS NULL');
      }
      messageJson = JSON.parse(record.Sns.Message);
      if (!messageJson.notificationType) {
        throw new Error('messageJson.notificationType IS NULL');
      }
    } catch(err) {
      request.post(postInfoUpload('SNS raw message', JSON.stringify(record.Sns, null, 2)), postCallback);
      return;
    }
    
    try {
      switch (messageJson.notificationType) {
        case "Bounce":
          notifyBounce(messageJson);
          break;

        case "Complaint":
          notifyComplaint(messageJson);
          break;

        case "Received":
          notifyReceived(messageJson);
          break;

        default:
          throw new Error('Unknown type.');
      };
    } catch(err) {
      request.post(postInfoUpload('SNS message', JSON.stringify(messageJson, null, 2)), postCallback);
    }
  });
};
