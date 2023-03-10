#!/bin/bash

STARTWEAIT=1800
WAIT=300

. /var/tmp/aws_env
SCRIPT_DIR=$(
	cd $(dirname $0)
	pwd
)
. ${SCRIPT_DIR}/utils.sh

FILE=/tmp/players

players() {
	${SCRIPT_DIR}/expect/listplayer.sh >$FILE
	user=$(cat $FILE | grep "in the game" | grep -Eo "[0-9]{1,4}")
	[[ $user == "" ]] && user=99
	echo $user
}


check_action() {
	[[ "$(players)" -eq "0" ]]
}

sleep $STARTWEAIT

while :; do
	sleep $WAIT
	check_action || continue
	echo 1..
	sleep $WAIT
	check_action  || continue
	echo 2..
	sleep $WAIT
	check_action  || continue
	break
done
[[ $(get_ssm_value maintenance) == true ]] && exit 0
CONTENT="${SERVERNAME}サーバーを停止しました"
post_message

stop_backup_shutdown
/usr/sbin/shutdown -h now
