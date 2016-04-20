# http://sirile.github.io/2015/05/18/using-haproxy-and-consul-for-dynamic-service-discovery-on-docker.html
# curl --no-buffer -XGET --unix-socket /docker.sock http:/events
#DOCKER_IP=$(docker-machine ip $DOCKER_MACHINE_NAME)
#docker run --name consul -d -h dev -p $DOCKER_IP:8300:8300 -p $DOCKER_IP:8301:8301 -p $DOCKER_IP:8301:8301/udp -p $DOCKER_IP:8302:8302 -p $DOCKER_IP:8302:8302/udp -p $DOCKER_IP:8400:8400 -p $DOCKER_IP:8500:8500 progrium/consul -server -advertise $DOCKER_IP -bootstrap-expect 1
#CONSUL_IP=$(docker inspect --format '{{ .NetworkSettings.IPAddress }}' consul)
#docker-machine ssh  $DOCKER_MACHINE_NAME "docker run -d -v /var/run/docker.sock:/tmp/docker.sock -h registrator --name registrator gliderlabs/registrator -ip $DOCKER_IP consul://$CONSUL_IP:8500"
#docker run -d -e SERVICE_NAME=hello/v1 -e SERVICE_TAGS=rest -h hello1 --name hello1 -p :80 sirile/scala-boot-test
#docker run --dns $CONSUL_IP --rm sirile/haproxy -consul=consul.service.consul:8500 -dry -once
#docker run -d -e SERVICE_NAME=rest --name=rest --dns $CONSUL_IP -p 80:80 -p 1936:1936 sirile/haproxy

docker run --name consul -d -h dev progrium/consul -server -bootstrap-expect 1
CONSUL_IP=$(docker-machine ssh $DOCKER_MACHINE_NAME "docker inspect --format '{{ .NetworkSettings.IPAddress }}' consul")
docker run --name consulweb -d -h web -p 8500:8500 progrium/consul -ui-dir=/ui -join=$CONSUL_IP
docker-machine ssh  $DOCKER_MACHINE_NAME "docker run -d -v /var/run/docker.sock:/tmp/docker.sock -h registrator --name registrator gliderlabs/registrator -internal consul://$CONSUL_IP:8500"
docker run -d -e SERVICE_NAME=hello/v1 -e SERVICE_TAGS=rest -h hello1 --name hello1 sirile/scala-boot-test
docker run -d -e SERVICE_NAME=rest --name=rest -p 80:80 -p 1936:1936 --dns $CONSUL_IP  sirile/haproxy

