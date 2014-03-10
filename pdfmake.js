var app = angular.module('pdfmake', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'mainPage.html',
		})
		.when('/gettingstarted', {
			templateUrl: 'gettingStarted.html',
		})
		.when('/docs', {
			templateUrl: 'docs.html',
		})
		.when('/playground', {
			templateUrl: 'playground.html',
			controller: 'PlaygroundController'
		})
		.otherwise({ redirectTo: '/' });
});
