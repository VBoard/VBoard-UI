define(
		['node_modules/bodybuilder/browser/bodybuilder.min'],
		function() {
      function MainController($scope, esFactory, ESService) {
        $scope.foo = "YEAH!"

				var Bodybuilder = require('node_modules/bodybuilder/browser/bodybuilder.min')

        //////////////////////////////////PRIMERO OBTENER INDICES////////////////////////////////
        ESService.client.cat.indices({
          h: ['index', 'docs.count']
        }).then(function (body) {
          let lines = body.split('\n');
          let indices = lines.map(function (line) {
            let row = line.split(' ');
            return {name: row[0], count: row[1]};
          });
          indices.pop(); //the last line is empty by default
          $scope.indexes = indices;
          console.log("INDICES", indices)
        });


        /////////////////////////////SHOW MAPPING OF THE INDEX SELECTED IF YOU WANT////////////////////////////
        $scope.searchMappingFromIndex = function(){
          $scope.showMapping = true;
          $scope.indexName = $("#indexesList").val();
          ESService.client.indices.getMapping({index: $scope.indexName}, function(error, resp) {
            if (error) {
                console.log(error);
            } else {
                console.log(resp);
                $scope.mapping = JSON.stringify(resp, undefined, 2);
            }
          });
        }
        $scope.hideMappingFromIndex = function(){
          $scope.showMapping = false;
        }
        ///////////////////////////////////////////////////////////////////////////////////////

        /////////////////////////////////////Mostrar tipos disponibles///////////////////
        $scope.typeFromIndex = function(){
          $scope.showTypeForm = true;

          $scope.indexName = $("#indexesList").val();
          ESService.client.indices.getMapping({index: $scope.indexName}, function(error, resp) {
            if (error) {
                console.log(error);
            } else {
                //console.log(resp);
                $scope.mapping = resp;
                $scope.types = Object.keys($scope.mapping[$scope.indexName].mappings);
                console.log($scope.mapping[$scope.indexName].mappings);
            }
          });
        }
        $scope.hideTypeForm = function(){
          $scope.showTypeForm = false;

        }
        //////////////////////////////////////////////////////////////////////

        /////////////////////////////////////Una vez con el indice y el tipo podemos buscar metricas y buckets///////////////

        $scope.showMetricsBuckets = function(){
          $scope.showMetricBucketsForm = true;
          $scope.typeName = $("#typesList").val();
          $scope.fields = Object.keys($scope.mapping[$scope.indexName].mappings[$scope.typeName].properties);
        }
        $scope.hideMetricsBucketsForm = function(){
          $scope.showMetricBucketsForm = false;

        }

        ///////////////////////////////////////////////////////////////////////

        /////////////////////////////////////Mostramos datos///////////////

        $scope.showData = function(){

          $scope.metricSelected = $("#metricList").val();
					$scope.typeBucket = "terms";
          $scope.bucketSelected = $("#bucketsList").val();
          $scope.sizeSelected = $("#sizeValue").val();

					//////PRUEBAS BODYBUILDER/////////
					var bodyAfterBuild = new Bodybuilder().aggregation($scope.typeBucket, $scope.bucketSelected + '.keyword', null, {order: {_term: 'desc'}, size: $scope.sizeSelected});
					console.log("Query bodybuilder en crudo", bodyAfterBuild)
					console.log("BodyBuilder", Bodybuilder)
					var bodyQuery = new Bodybuilder().aggregation('terms', $scope.bucketSelected + '.keyword', null, {order: {_term: 'desc'}, size: $scope.sizeSelected}).build('v2')
					console.log("Query bodybuilder", bodyQuery)
					/////////////////////////////////

          ESService.client.search({
            index: 'opnfv',
            type: 'items',
            size: $scope.sizeSelected,
            body: bodyQuery

						/*{
              "query": {
                "bool": {
                  "must": [
                    {
                      "query_string": {
                        "query": "*",
                        "analyze_wildcard": true
                      }
                    },
                  ],
                  "must_not": []
                }
              },
              "aggs": {
                "author": {
                  "terms": {
                    "field": $scope.bucketSelected + ".keyword",
                    "size": $scope.sizeSelected,
                    "order": {
                      "_count": "desc"
                    }
                  }
                }
              }
            }*/
          }).then(function (resp) {
              //$scope.hits = resp.hits.hits;
              $scope.hits = JSON.stringify(resp.hits, undefined, 2);
              $scope.aggregationsToShow = JSON.stringify(resp.aggregations, undefined, 2);
              $scope.aggregations = resp.aggregations;
              console.log("RESPUESTA: ", resp)
              $scope.build3DChart();
          }, function (err) {
              $scope.hits = "NO RESULTS"
              console.trace(err.message);
          });
        };
        /////////////////////////////////////////////////////////////////////////////////////////////////7

        /////////////////////////////////CONSTRUCCIÓN DE THREEDC////////////////////////////////////////////
        $scope.build3DChart = function(){
          var container, scene, camera, renderer;

          //objetc which will contain the library functions
          var dash;

          init();
          animate();

          function init () {

             ///////////
             // SCENE //
             ///////////
             scene = new THREE.Scene();

             ////////////
             // CAMERA //
             ////////////
             // set the view size in pixels (custom or according to window size)
             var SCREEN_WIDTH = window.innerWidth;
             var SCREEN_HEIGHT = window.innerHeight;
             // camera attributes
             var VIEW_ANGLE = 45;
             var ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
             var NEAR = 0.1;
             var FAR = 20000;
                // set up camera
             camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
             // add the camera to the scene
             scene.add(camera);
             // the camera defaults to position (0,0,0)
             //    so pull it back (z = 400) and up (y = 100) and set the angle towards the scene origin
             camera.position.set(-553,584,868);

             //////////////
             // RENDERER //
             //////////////
             renderer = new THREE.WebGLRenderer( {antialias:true} );
             renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
             renderer.setClearColor( 0xd8d8d8 );

             // attach div element to variable to contain the renderer
             container = document.getElementById( 'ThreeJS' );
             // attach renderer to the container div
             container.appendChild( renderer.domElement );

            ////////////
            // EVENTS //
            ////////////


            // automatically resize renderer
            THREEx.WindowResize(renderer, camera);

             ///////////
             // LIGHTS //
             ///////////
             var light1 = new THREE.PointLight(0xffffff,0.8);
             light1.position.set(0,2500,2500);
             scene.add(light1);

             var light2 = new THREE.PointLight(0xffffff,0.8);
             light2.position.set(-2500,2500,-2500);
             scene.add(light2);

             var light3 = new THREE.PointLight(0xffffff,0.8);
             light3.position.set(2500,2500,-2500);
             scene.add(light3);

             // create a set of coordinate axes to help orient user
             //    specify length in pixels in each direction
             var axes = new THREE.AxisHelper(1000);
             scene.add(axes);

             ////////////////////////////MASAJEO DE DATOS//////////////////////////////

             $scope.slices = $scope.aggregations['agg_' + $scope.typeBucket + '_' + $scope.bucketSelected + '.keyword'].buckets.map(function(bucket) {

              var value = bucket.doc_count;

                return {
                  key: bucket.key,
                  value: value
                  };
            });
            ///////////////////////////////////////////////////////////////////////////


            //the empty object will be returned with the library functions
            dash = THREEDC({},camera,scene,renderer,container);

            var data1= [{key:'monday',value:20},{key:'tuesday',value:80},{key:'friday',value:30}];

            pie=dash.pieChart([100,100,100])
            pie.data($scope.slices);

             dash.renderAll();

          }

          function animate(){
             requestAnimationFrame( animate );
             render();
             update();
          }

          function render(){
             renderer.render( scene, camera );
          }

          function update(){
            dash.controls.update();
          }
        }

      }

      MainController.$inject = [ '$scope', 'esFactory', 'ESService'];

			return MainController;

});
