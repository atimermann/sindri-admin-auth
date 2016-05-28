/**
 * Created by André Timermann on 09/05/16.
 *
 * sindri-admin-auth/apps/adminAuth/server/models/usuario.js
 */
'use strict';

const Model = require('sindri-framework/model');
const auth = require('sindri-auth/auth');
const _ = require('lodash');

class UsuarioModel extends Model {

    setup() {

        this.connection = 'default';

        this.tableName = 'usuario';

        this.primaryKey = 'usuario_id';

        this.schema = {

            usuario_id: {
                type: 'numeric',
                name: 'id' // Automatico para Primay Key, mas está aqui para ilustrar oq poderia ser feito com outros campos tb (renomear)
            },


            usuario: {
                type: 'string',
                size: 255,
                nullable: false,
                validation: ['required', 'unique'],
                client: {
                    'default': {
                        label: "Usuário"
                    }
                }

            },

            senha: {
                type: 'string',
                size: 255,
                nullable: false,
                validation: ['required'],
                select: false,
                set: function bcrypt(value, fieldName, model) {

                    return auth.createHash(value);
                },
                client: true
            }

        };

    }

    /**
     * Verifica se Token existe,
     *
     * Deve retornar:
     *  null ou false caso não encontre
     *  Objeto instancia Error caso ocorra um erro
     *  Objeto representando Usuario, com todas as informações de perfil etc
     *
     * @param username
     * @param token
     */
    static getUser(username, token) {

        var self = this;
        let usuario = new UsuarioModel();

        return usuario
            .db(usuario.tableName)
            .count('* as t')
            .where({
                'usuario': username,
                'token': token,
                'ativo': true
            })
            .then(function (row) {

                if (row[0].t === 1) {

                    return self.loadUser(username);

                } else {
                    return false;
                }
            });

    }

    /**
     * Dado Objeto com Informação do Usuario, retorna Dados que vão para o Cliente (Filtra)
     *
     * @param   {Object} user Dados do Usuário
     *
     * @returns {Object} Dados do Usuário Filtrado
     */
    static getClientUser(user) {

        return {
            // permissions: user.permissions,
            // admin: (user.administrador === true),
            // account: !_.isNull(user.conta),
            // owner: !_.isNull(user.proprietario)
        };

    }

    /**
     * Retorna Hash
     *
     * @param  {[type]} username [description]
     * @return {[type]}          [description]
     */
    static getHash(username) {

        let usuario = new UsuarioModel();

        return usuario
            .db(usuario.tableName)
            .select('senha')
            .where({
                'usuario': username,
                'ativo': true
            })
            .then(function (row) {

                ////////////////////////////////
                // Usuário Existe
                ////////////////////////////////
                if (row[0]) {
                    // Forçar usuário a aguardar 1 segundo
                    return row[0].senha;

                } else {

                    return false;

                }

            });


    }

    /**
     * Salva Token no Banco de Dados
     *
     * @param username
     * @param token
     * @param knexConnections
     * @param s
     * @param done
     */
    static saveToken(username, token) {

        let usuario = new UsuarioModel();

        return usuario.db('usuario')
            .where({
                'usuario': username,
                'ativo': true
            })
            .update('token', token);


    }

    /**
     * Carrega Informações do Usuário
     *
     * @param username
     *
     */
    static loadUser(username) {


        let self = this;
        let usuario = new UsuarioModel();

        let user;

        /////////////////////////////////////////////////////////////
        //Carrega Info do Usuário
        /////////////////////////////////////////////////////////////
        return usuario.db('usuario as u')
            .first('u.usuario_id as id')
            .where({
                "u.ativo": true,
                "u.usuario": username
            })
            .then(function (row) {

                // Pegamos o valor do primeiro byte
                user = row;
                // user.administrador = user.administradorGe[0];


            })
            /////////////////////////////////////////////////////////////
            // Carrega Lista de Permissões
            /////////////////////////////////////////////////////////////
            .then(function () {

                return usuario.db
                    .select('pe.permissao AS permissao')
                    .from('usuario as u')
                    .join('usuario__perfil as up', 'up.usuario_id', 'u.usuario_id')
                    .join('perfil as p', 'up.perfil_id', 'p.perfil_id')
                    .join('perfil__permissao AS pp', 'p.perfil_id', 'pp.perfil_id')
                    .join('permissao as pe', 'pp.permissao_id', 'pe.permissao_id')
                    .where({
                        "u.ativo": 1,
                        "u.usuario": username
                    });


            })
            /////////////////////////////////////////////////////////////
            // Retorna usuário
            /////////////////////////////////////////////////////////////
            .then(function (rows) {

                user.permissions = _.map(rows, 'permissao');

                return user;

            });

    }



}

module.exports = UsuarioModel;
