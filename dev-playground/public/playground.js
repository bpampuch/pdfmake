var app = angular.module('pdfmake', ['ngRoute']);

app.config(function($routeProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'index.html',
			controller: 'PlaygroundController'
		})
		.otherwise({ redirectTo: '/' });
});
