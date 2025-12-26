{ pkgs, lib, config, inputs, ... }:

{
  packages = [ pkgs.just ];

  # https://devenv.sh/languages/
  languages.go.enable = true;
  languages.javascript.enable = true;
  languages.javascript.npm.enable = true;
}
