#!/bin/bash

setup() {
	yum update -y
	yum install -y docker jq ipset expect telnet
	systemctl start docker
	usermod -a -G docker ec2-user
	curl -sL https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
	chmod +x /usr/local/bin/docker-compose
	docker-compose version
    amazon-linux-extras enable aws-nitro-enclaves-cli
    amazon-linux-extras enable nginx1
    amazon-linux-extras install nginx1 -y
    yum install aws-nitro-enclaves-acm -y
    yum install amazon-cloudwatch-agent -y
    mv /etc/nitro_enclaves/acm.example.yaml /etc/nitro_enclaves/acm.yaml
}

set -ex
setup >/var/tmp/userdata.log 2>&1
set +ex

PREFIX=$1
SERVERNAME=$2
VOLSIZE=$3
SNAPSHOTGEN=$4
POSTSERVICE=$5
TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
AZ=$(curl -sH "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone)
IPADDRESS=$(curl -sH "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
INSTANCEID=$(curl -sH "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
AWS_DEFAULT_REGION=$(echo $AZ | sed -e 's/.$//')

cat <<EOS >/var/tmp/aws_env
export PREFIX=$PREFIX
export SERVERNAME=$SERVERNAME
export VOLSIZE=$VOLSIZE
export SNAPSHOTGEN=$SNAPSHOTGEN
export POSTSERVICE=$POSTSERVICE
export AZ=$AZ
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}
export AWS_REGION=${AWS_DEFAULT_REGION}
export INSTANCEID=${INSTANCEID}
export IPADDRESS=${IPADDRESS}
EOS

. /var/lib/scripts/utils.sh
set -x
upsert_domain
/var/lib/scripts/send_ip.sh
mount_latest >>/var/tmp/userdata_mount.log 2>&1
#/var/lib/scripts/update_allow_list.sh >>/var/tmp/update_allow_list.log 2>&1

mv /mnt/game/log/console/sdtdserver-console.log /mnt/game/log/console/sdtdserver-console.log.old
/var/lib/scripts/check-spot-action.sh &
/var/lib/scripts/send_start.sh &
/var/lib/scripts/down_cron.sh &

start_service
