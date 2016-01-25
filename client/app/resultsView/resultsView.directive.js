'use strict';

angular.module('nightlifeApp')

  .controller('ResultsController', function($scope, resultsService) {
    $scope.results = resultsService.getResults();
    $scope.$on('results:updated', function(){
      $scope.results = resultsService.getResults();
    })
  })

  .directive('resultsView', function () {
    return {
      templateUrl: 'app/resultsView/resultsView.html',
      restrict: 'EA',
      controller: 'ResultsController',
      link: function (scope, element, attrs) {
      }
    };
  });
