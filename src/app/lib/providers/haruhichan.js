(function (App) {
	'use strict';
	var querystring = require('querystring');
	var request = require('request');
	var Q = require('q');
	var inherits = require('util').inherits;


	var statusMap = {
		0: 'Not Airing Yet',
		1: 'Currently Airing',
		2: 'Ended'
	};

	var URL = 'http://ptp.haruhichan.com/';

	var Haruhichan = function () {
		Haruhichan.super_.call(this);
	};

	inherits(Haruhichan, App.Providers.Generic);

	var queryTorrents = function (filters) {
		// http://ptp.haruhichan.com/list.php?page=0&sort=rank&order=desc&limit=50&state=1
		var deferred = Q.defer();

		var params = {};
		params.sort = 'popularity';
		params.limit = '50';
		params.type = 'All';
		params.page = (filters.page ? filters.page - 1 : 0);

		if (filters.keywords) {
			params.keywords = filters.keywords.replace(/\s/g, '% ');
		}

		var genre = filters.genre;
		if (genre && (genre !== 'All')) {
			params.genre = genre;
		}

		switch (filters.order) {
		case 1:
			params.order = 'asc';
			break;
		case -1:
			/* falls through */
		default:
			params.order = 'desc';
			break;
		}

		if (filters.sorter && filters.sorter !== 'popularity') {
			params.sort = filters.sorter;
		}

		if (filters.type && filters.type !== 'All') {
			if (filters.type === 'Movies') {
				params.type = 'movie';
			} else {
				params.type = filters.type.toLowerCase();
			}
		}

		// XXX(xaiki): haruchichan currently doesn't support filters
		var url = URL + 'list.php?' + querystring.stringify(params).replace(/%25%20/g, '%20');
		win.info('Request to HARUHICHAN API');
		win.debug(url);
		request({
			url: url,
			json: true
		}, function (error, response, data) {
			if (error) {
				deferred.reject(error);
			} else if (!data || (data.error && data.error !== 'No movies found')) {
				var err = data ? data.error : 'No data returned';
				win.error('API error:', err);
				deferred.reject(err);
			} else {
				deferred.resolve(data);
			}
		});

		return deferred.promise;
	};

	var parseTime = function (duration) {
		var time = duration.match(/(?:([0-9]+) h)?.*?(?:([0-9]+) min)/);
		if (!time) {
			return console.error('couldn\'t parse time:', time);
		}
		return (time[1] ? time[1] : 0) * 60 + Number(time[2]);
	};

	var formatForPopcorn = function (items) {
		console.log(_.pluck(items, 'type'));
		var results = _.map(items, function (item) {
			var img = item.malimg;
			var type = (item.type === 'Movie') ? 'movie' : 'show';

			var ret = {
				images: {
					poster: img,
					fanart: img,
					banner: img
				},
				mal_id: item.MAL,
				haru_id: item.id,
				tvdb_id: 'mal-' + item.id,
				imdb_id: 'mal-' + item.id,
				slug: item.name.toLowerCase().replace(/\s/g, '-'),
				title: item.name,
				year: item.aired.split(', ')[1].replace(/ to.*/, ''),
				type: type,
				item_data: item.type
			};
			return ret;
		});

		return {
			results: results,
			hasMore: true
		};
	};

	// Single element query
	var queryTorrent = function (torrent_id, prev_data, callback) {
		var id = torrent_id.split('-')[1];
		var url = URL + 'anime.php?id=' + id;

		win.info('Request to HARUHICHAN API');
		win.debug(url);
		request({
			url: url,
			json: true
		}, function (error, response, data) {
			if (error) {

				callback(error, false);

			} else if (!data || (data.error && data.error !== 'No data returned')) {

				var err = data ? data.error : 'No data returned';
				win.error('API error:', err);
				callback(err, false);

			} else {

				// we cache our new element
				callback(false, formatDetailForPopcorn(data, prev_data));

			}
		});
	};

	var movieTorrents = function (id, dl) {
		var torrents = {};
		_.each(dl, function (item) {
			var quality = item.quality.match(/[0-9]+p/)[0];
			torrents[quality] = {
				seeds: 0,
				peers: 0,
				url: item.magnet,
				health: 'good'
			};
		});

		return torrents;
	};

	var showTorrents = function (id, dl) {
		var torrents = {};
		_.each(dl, function (item) {
			var quality = item.quality.match(/[0-9]+p/)[0];
			var match = item.name.match(/[\s_]([0-9]+(-[0-9]+)?|CM|OVA)[\s_]/);
			if (!match) {
				console.error('could not match', item.name);
				return;
			}
			var episode = match[1];
			if (!torrents[episode]) {
				torrents[episode] = {};
			}
			torrents[episode][quality] = {
				seeds: 0,
				peers: 0,
				url: item.magnet,
				health: 'good'
			};
		});
		return _.map(torrents, function (torrents, s) {
			return {
				title: 'Episode ' + s,
				torrents: torrents,
				season: 1,
				episode: Number(s.split('-')[0]),
				overview: 'we still don\'t have single episodes overview for anime… sorry',
				tvdb_id: id + '-1-' + s
			};
		});
	};

	var formatDetailForPopcorn = function (item, prev) {
		var img = item.malimg;
		var type = prev.type;
		var genres = item.genres.split(', ');

		var ret = _.extend(prev, {
			country: 'Japan',
			genre: genres.join(' - '),
			genres: genres,
			num_seasons: 1,
			runtime: parseTime(item.duration),
			status: statusMap[item.status],
			synopsis: item.synopsis,
			network: item.producers, //FIXME
			rating: { // FIXME
				hated: 0,
				loved: 0,
				votes: 0,
				percentage: item.score
			},
			images: {
				poster: img,
				fanart: img,
				banner: img
			},
			year: item.aired.split(', ')[1].replace(/ to.*/, ''),
			type: type
		});

		if (type === 'movie') {
			ret = _.extend(ret, {
				rating: 0,
				subtitle: undefined,
				torrents: movieTorrents(item.id, item.episodes),
			});
		} else {
			ret = _.extend(ret, {
				episodes: showTorrents(item.id, item.episodes)
			});
		}

		console.log('haruhiret', ret);
		return ret;
	};

	Haruhichan.prototype.extractIds = function (items) {
		return _.pluck(items.results, 'haru_id');
	};

	Haruhichan.prototype.fetch = function (filters) {
		return queryTorrents(filters)
			.then(formatForPopcorn);
	};

	Haruhichan.prototype.detail = function (torrent_id, prev_data, callback) {
		return queryTorrent(torrent_id, prev_data, callback);
	};

	App.Providers.Haruhichan = Haruhichan;

})(window.App);
