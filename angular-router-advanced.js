/*
* Copyright 2013 Sahibinden Bilgi Teknolojileri Pazarlama ve Ticaret A.Ş.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

/**
 * @ngdoc directive
 * @name sahibinden.router:saRouter
 *
 * @description
 *
 * Dil destekli, ters çevrilebilir router kütüphanesi.
 *
 <doc:example>
     <doc:source>
         <script>
            angular.module('app', ['sahibinden.router'])
                .config(function ($routeProvider, saRouter) {
                    'use strict';

                    // Url tanimlamalari
                    saRouter.when({
                            'tr': '/bana-ozel/mesajlarim/detay/:id',
                            'en': '/my-account/messages/detail/:id'
                        }, {
                            name: 'my_messages',
                            controller: 'MyAccountMessageDetailCtrl',
                            templateUrl: '/views/myAccount/messages/MyAccountMessageDetail.html'
                        })

                        .install($routeProvider);

                });
        </script>
        <div>
            <a ng-href="{{ url('my_messages') }}">Mesajlarim</a>
        </div>
     </doc:source>
 </doc:example>
 *
 */

angular
    .module('sahibinden.router', [])
    .provider('saRouter', function () {
        'use strict';

        var lookup = {},
            otherwiseLookup = null,
            defaultLang = 'en';

        this.setDefaultLang = function (lang) {
            defaultLang = lang;
        };

        this.getDefaultLang = function () {
            return defaultLang;
        };

        this.when = function (url, params) {
            var lang, key;

            key = params.name || url;

            if (angular.isObject(url)) {
                for (lang in url) {
                    lookup[key + '_' + lang] = {
                        url: url[lang],
                        params: angular.extend({
                            lang: lang,
                            routeName: key + '_' + lang
                        }, params)
                    };

                }

                // Route for default language
                lookup[key] = {
                    url: url[defaultLang],
                    params: angular.extend({
                        lang: defaultLang,
                        routeName: key
                    }, params)
                };

            } else {
                lookup[key] = {
                    url : url,
                    params : angular.extend({
                        lang: defaultLang,
                        routeName: key
                    }, params)
                };
            }

            return this;
        };

        this.alias = function (key1, key2) {
            lookup[key1] = lookup[key2];

            return this;
        };

        this.otherwise = function (params) {
            otherwiseLookup = params;

            return this;
        };

        this.install = function ($routeProvider) {
            var route,
                url,
                params,
                key;

            for (key in lookup) {
                route = lookup[key];
                url = route.url;
                params = route.params;

                $routeProvider.when(url, params);
            }

            if (otherwiseLookup) {
                $routeProvider.otherwise(otherwiseLookup);
            }

            return this;
        };

        this.$get = function () {
            return {
                setDefaultLang : function (lang) {
                    defaultLang = lang;
                },

                getDefaultLang : function () {
                    return defaultLang;
                },

                replaceUrlParams : function (url, params) {
                    var k, v;

                    for (k in params) {
                        v = params[k];
                        url = url.replace(':' + k, v);
                    }
                    return url;
                },

                routeDefined : function (key) {
                    return !! this.getRoute(key);
                },

                getRoute : function (key, args) {
                    var langKey = args ? key + '_' + args.lang : key;
                    return lookup[langKey] || lookup[key];
                },

                routePath : function (key, args) {
                    var url = this.getRoute(key, args);
                    url = url ? url.url : null;

                    if (url && args) {
                        url = this.replaceUrlParams(url, args);
                    }

                    return url;
                },

                getAlternatesFromStaticRoutes : function (key, languages) {
                    var result=[];
                    for(var i =0;i<languages.length;i++){
                        var p= {};
                        p.lang =languages[i];
                        result.push({route:this.routePath(key,p),lang:languages[i]});

                    };
                    return result;
                },
                
                getAlternatesFromDynamicRoutes : function (key, params) {
                    var result=[];
                    for(var i =0;i<params.length;i++){
                        var p = params[i];
                        result.push({route:this.routePath(key,p),lang: p.lang});

                    };
                    return result;
                }
            };
        };
    })

    .run(function ($rootScope, saRouter, $route) {
        'use strict';

        var defaultLang = saRouter.getDefaultLang();

        $rootScope.$on('$routeChangeStart', function (previous, current) {
            $rootScope.lang = current.lang || defaultLang;
        });

        // Returns url that has given routeName with optional arguments
        $rootScope.url = function (routeName, args) {
            args = angular.extend({
                    lang: $rootScope.lang
                }, args);

            return saRouter.routePath(routeName, args);
        };

        $rootScope.isActive = function (routeName, current) {
            current = current || $route.current;

            // If current route info not ready, return false
            if (!current) {
                return false;
            }

            // Maybe multiple routeNames be asked
            var routeNames = routeName.split(','),
                routeNameMap = {};

            angular.forEach(routeNames, function (item) {
                // Build a map that has keys as routeNames with current language postfixes if is necessary
                routeNameMap[item] = true;
                routeNameMap[item + (current.lang ? '_' + current.lang : '')] = true;
            });

            // Check current routeName is in current routename map keys
            return current.routeName in routeNameMap;
        };
    });

