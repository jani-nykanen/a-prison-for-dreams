JS_FILES := $(wildcard js/*.js) $(wildcard js/*/*.js) $(wildcard js/*/*/*.js)


all: js


.PHONY: js
js:
	tsc

watch:
	tsc -w

server:
	python3 -m http.server


linecount:
	find . -name '*.ts' | xargs wc -l
	

pack_raw:
	mkdir -p temp
	cp -r assets temp/assets
	cp -r js temp/js
	cp index.html temp/index.html
	cp style.css temp/style.css
	(cd temp; zip -r ../dist.zip .)
	rm -rf ./temp

dist_raw: js pack_raw


.PHONY: closure
closure:
	rm -rf ./temp
	mkdir -p temp
	java -jar $(CLOSURE_PATH) --js $(JS_FILES) --js_output_file temp/out.js --compilation_level ADVANCED_OPTIMIZATIONS --language_out ECMASCRIPT_2020


compress: js closure


.PHONY: pack_assets
pack_assets:
	mkdir -p temp
	cp -r assets temp/assets
	cp -r js temp/js
	cp templates/index.html temp/index.html
	cp style.css temp/style.css

.PHONY: zip
zip: 
	(cd temp; zip -r ../dist.zip .)

.PHONY: clear_temp
clear_temp:
	rm -rf ./temp 


.PHONY: dist 
dist: compress pack_assets zip clear_temp


.PHONY: test_temp
test_temp:
	(cd temp; python3 -m http.server 8001)
