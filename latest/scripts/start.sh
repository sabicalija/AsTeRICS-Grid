/bin/sh /home/superlogin/AsTeRICS-Grid/scripts/stop.sh
/bin/sh -c "sudo -u superlogin npm --prefix /home/superlogin/AsTeRICS-Grid/ run start-superlogin-prod" &
/bin/sh -c "sudo -u superlogin /bin/sh /home/superlogin/AsTeRICS-Grid/scripts/goaccess_start.sh" &