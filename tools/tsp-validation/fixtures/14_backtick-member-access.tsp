// TEST: backtick member access on inline models with special character property names
// EXPECT: compiles clean

model Inline {
  `/todos`: string;
  `/todos/{id}`: string;
  `x-custom`: string;
  normalProp: string;
}

alias Normal = Inline.normalProp;
alias A = Inline.`/todos`;
alias B = Inline.`/todos/{id}`;
alias C = Inline.`x-custom`;
