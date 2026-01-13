const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
// const CssMinimizerPlugin = require('css-minimizer-webpack-plugin'); // Disabled due to CSS parsing issues
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {

  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src/'),
      '@components': path.resolve(__dirname, 'src/components/'),
      '@hooks': path.resolve(__dirname, 'src/hooks/'),
      '@services': path.resolve(__dirname, 'src/services/'),
      '@utils': path.resolve(__dirname, 'src/utils/'),
      '@types': path.resolve(__dirname, 'src/types/'),
      '@contexts': path.resolve(__dirname, 'src/contexts/'),
      '@store': path.resolve(__dirname, 'src/store/'),
      '@features': path.resolve(__dirname, 'src/features/'),
      '@pages': path.resolve(__dirname, 'src/pages/'),
      '@lib': path.resolve(__dirname, 'src/lib/'),
      '@constants': path.resolve(__dirname, 'src/constants/'),
    },
    configure: (webpackConfig, { env }) => {
      // Disable source maps in production
      if (env === 'production') {
        webpackConfig.devtool = false;
      }

      // Disable ESLint warnings as errors in CI/production
      if (process.env.CI === 'true' || env === 'production') {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => plugin.constructor.name !== 'ESLintWebpackPlugin'
        );
      }

      // Performance optimizations for production
      if (env === 'production') {
        // Remove CSS minimizer to avoid parsing errors
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer.filter(
          (plugin) => plugin.constructor.name !== 'CssMinimizerPlugin'
        );

        console.log('CSS minimization disabled - fix CSS syntax issues first');

        // Add compression - DISABLED for Capacitor compatibility (fixes Duplicate resources error)
        // webpackConfig.plugins.push(
        //   new CompressionPlugin({
        //     algorithm: 'gzip',
        //     test: /\.(js|css|html|svg)$/,
        //     threshold: 8192,
        //     minRatio: 0.8,
        //   })
        // );

        // Bundle analysis (only when ANALYZE=true)
        if (process.env.ANALYZE) {
          webpackConfig.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
            })
          );
        }

        // Optimize chunks
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
            },
            firebase: {
              test: /[\\/]node_modules[\\/]firebase[\\/]/,
              name: 'firebase',
              priority: 20,
              chunks: 'all',
            },
            three: {
              test: /[\\/]node_modules[\\/]three[\\/]/,
              name: 'three',
              priority: 20,
              chunks: 'all',
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              chunks: 'all',
            },
          },
        };

        // Tree shaking optimization
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.sideEffects = false;
      }

      return webpackConfig;
    },
  },
  devServer: {
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws',
    },
    onListening: function (devServer) {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
    },
  },
};
