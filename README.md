# amazon-ses-notify-to-slack
SES -> S3 &amp; SNS -> Lambda(this) -> Slack

## Install
* yarn install
* zip -r amazon-ses-notify-to-slack.zip *
* Upload amazon-ses-notify-to-slack.zip to Lambda
* Set environments:
  * TZ: timezone ("Asia/Tokyo")
  * REGION: S3 region. ("ap-northeast-1")
  * TOKEN: Slack bot token. ("xoxb-〜")
  * CHANNEL: channel to post notification. ("#channel")
* Set Lambda triggered by SNS notification(You may need to specify SNS topic ARN directly to set SNS topic which is in different region.)

## AWS Setting

### SNS
* make topic to use.(region must be same as SES's)

### S3(for mail receiving)
* create bucket for saving received mail data.
* set bucket policy to make SES can put file.
  * See: https://docs.aws.amazon.com/ses/latest/DeveloperGuide/receiving-email-permissions.html

### SES
* bounces, complaints -> SNS topic (Include original headers)
* Email Receiving>Rule Sets -> save to S3 bucket and send SNS topic.
