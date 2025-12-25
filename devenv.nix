{ pkgs, lib, config, inputs, ... }:

{
  packages = [ pkgs.just ];

  # https://devenv.sh/languages/
  languages.javascript.enable = true;
  languages.javascript.npm.enable = true;
}
