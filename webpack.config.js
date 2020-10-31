const path = require('path')
// const MonacoPlugin = require('monaco-editor-webpack-plugin')
const HtmlPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: {
        main: path.resolve(__dirname, 'client/index.ts')
    },
    output: {
        path: path.resolve(__dirname, 'wwwroot'),
        filename: 'static/[name].bundle.js',
    },
    resolve: {
        extensions: [".js", ".ts"]
    },
    module: {
        rules: [{
            test: /\.jsx?$/,
            use: ['source-map-loader'],
        }, {
            test: /\.css$/,
            use: ['style-loader', 'css-loader'],
        }, {
            test: /\.ttf$/,
            loader: 'file-loader',
            options: {
                name: 'static/[name].[ext]',
            },
        }, {
            test: /\.tsx?$/,
            use: ['ts-loader'],
        }]
    },
    devServer: {
        contentBase: path.resolve(__dirname, 'public'),
        compress: true,
    },
    plugins: [
        new HtmlPlugin({
            template: path.resolve(__dirname, 'public/index.html')
        }),
        new CopyPlugin({
            patterns: [
                { from: 'public', to: '.' },
            ],
        }),
        // new MonacoPlugin({
        //     filename: 'static/[name].worker.js'
        // }),
        new CleanWebpackPlugin(),
    ],
    optimization: {
        emitOnErrors: false
    }
}