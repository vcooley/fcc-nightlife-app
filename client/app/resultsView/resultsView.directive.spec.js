'use strict';

describe('Directive: resultsView', function () {

  var $controller, $rootScope, $httpBackend, AuthMock, controller,
      resultsService, sampleBusinessData, scopeBusiness, user;

  var specBusiness = (function() {
    var business = {};

    return {
      getBusiness: function() {
       return business;
    },
      setBusiness: function(newBusiness) {
        business = newBusiness
      }
    };
  })();

  // load the controller's module
  beforeEach(module('nightlifeApp'));

  beforeEach(function() {

    AuthMock = (function() {
      var currentUser = {};
      return {
        setMockUser: function (user) {
          currentUser = user;
        },
        getCurrentUser: function() {
          return currentUser;
        }
      }
    })();

    module(function($provide) {
      $provide.value('Auth', AuthMock);
    });
  });

  beforeEach(inject(function($injector) {
    // inject dependencies and mocks
    $rootScope = $injector.get('$rootScope');
    $controller = $injector.get('$controller');
    $httpBackend = $injector.get('$httpBackend');
    resultsService = $injector.get('resultsService');

    // Create controller instance
    controller = (function() {
      return $controller('ResultsController', {'$scope' : $rootScope});
    })();

    // Read mock data and set results. This also will result in a broadcast of the results to the
    // controller as tested in the first test
    sampleBusinessData = readJSON('client/app/mocks/businessData.mock.json');
    resultsService.setResults(sampleBusinessData);

    // Set up a default business for tests
    scopeBusiness = $rootScope.results.businesses[0];
    specBusiness.setBusiness(readJSON('client/app/mocks/businessData.mock.json').businesses[0]);

  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('ResultsController', function() {

    it('should initialize $scope.results to object obtained from resultsService', function() {
      expect($rootScope.results).toBe(resultsService.getResults());
    });

    it('should update results when they change', function() {
      sampleBusinessData.businesses[0].visitorData.visitorsTonight++;
      resultsService.setResults(sampleBusinessData);
      expect($rootScope.results).toEqual(resultsService.getResults());
    });

    describe('#toggleVisitor', function() {

      it('should send PATCH request with addVisitor op on authenticated RSVP', function() {
        user = getMockUser('test');
        AuthMock.setMockUser(user);
        var userIndex = _.findIndex(scopeBusiness.visitorData.visitors, function(o) {
          return user.username === o.username;
        });
        expect(userIndex).toBe(-1);
        $httpBackend.expectPATCH('/api/businesses/' + scopeBusiness.id, {
          op: 'addVisitor',
          path: '/api/businesses/' + scopeBusiness.id
        })
          .respond(200, (function() {
            // Update data and respond
            var data = specBusiness.getBusiness().visitorData;
            var newVisitor = {
              name: user.name,
              username: user.username,
              profileImage: user.twitter.profile_image_url_https
            };
            data.visitors.push(newVisitor);
            data.visitorsTonight++;
            data.visitorsAllTime++;
            expect(specBusiness.getBusiness()).not.toEqual(scopeBusiness);
            return data;
            })()
          );
        $rootScope.toggleVisitor(0);
        $httpBackend.flush();
        expect(_.findIndex(scopeBusiness.visitorData.visitors, function(visitor) {
          return user.username === visitor.username;
        })).not.toBe(-1);
        expect(scopeBusiness).toEqual(specBusiness.getBusiness());
      });

      it('should send PATCH request with removeVisitor op if user has already RSVPd', function() {
        user = getMockUser('test');
        user.visitorListData = {
          name: user.name,
          username: user.username,
          profileImage: user.twitter.profile_image_url_https
        };
        AuthMock.setMockUser(user);
        // Expect the user not to be going yet
        expect(scopeBusiness.visitorData.visitors.indexOf(user.username)).toBe(-1);
        // Add user to the list
        scopeBusiness.visitorData.visitors.push(user.visitorListData);
        specBusiness.getBusiness().visitorData.visitors.push(user.visitorListData);
        expect(scopeBusiness).toEqual(specBusiness.getBusiness());
        $httpBackend.expectPATCH('/api/businesses/' + scopeBusiness.id, {
            op: 'removeVisitor',
            path: '/api/businesses/' + scopeBusiness.id
          })
          .respond(200, (function() {
            // Update data and respond
            var data = specBusiness.getBusiness().visitorData;
            var index = _.findIndex(data.visitors, ['username', user.username]);
            data.visitors.splice(index, 1);
            data.visitorsTonight--;
            data.visitorsAllTime--;
            expect(specBusiness.getBusiness()).not.toEqual(scopeBusiness);
            return data;
          })()
          );
        $rootScope.toggleVisitor(0);
        $httpBackend.flush();
        expect(_.findIndex(scopeBusiness.visitorData.visitors, ['username', user.username])).toBe(-1);
      });

    });
  })
});
