# amazon-ses-notify-to-slack
SES -> S3 &amp; SNS -> Lambda(this) -> Slack

## Install
* yarn install
* zip -r amazon-ses-notify-to-slack.zip *
* Upload amazon-ses-notify-to-slack.zip to Lambda
* Set environments:
  * TZ: timezone ("Asia/Tokyo")
  * REGION: S3 region. ("ap-northeast-1")
  * TOKEN: Slack bot token.
  * CHANNEL: channel to post notification. ("#channel")
* Set Lambda triggered by SNS notification.

## AWS Setting

### SNS
* make topic to use.

### S3
* create bucket for saving received mail data.
* set bucket policy to make SES can put file.

### SES
* bounce, complaint -> SNS topic (include headers)
* receive rule -> save to S3 bucket and send SNS topic.
