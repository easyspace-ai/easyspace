module github.com/easyspace-ai/luckdb/server/demo

go 1.23.0

require (
	github.com/easyspace-ai/luckdb/server v0.0.0
	github.com/gorilla/websocket v1.5.1
)

require (
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	golang.org/x/net v0.38.0 // indirect
)

replace github.com/easyspace-ai/luckdb/server => ../
