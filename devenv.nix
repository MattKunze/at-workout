{ pkgs, lib, config, inputs, ... }:

{
  packages = [ pkgs.just ];

  # https://devenv.sh/languages/
  languages.deno.enable = true;
}
