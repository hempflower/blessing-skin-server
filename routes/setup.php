<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

/**
 * Setup Wizard.
 */
Route::group(['prefix' => 'setup'], function () {
    Route::group(['middleware' => 'setup'], function () {
        Route::any('/', 'SetupController@welcome');
        Route::any('/database', 'SetupController@database');
        Route::get('/info', 'SetupController@info');
        Route::post('/finish', 'SetupController@finish');
    });

    Route::get('/update', 'SetupController@update');
    Route::post('/update', 'SetupController@doUpdate');
});
