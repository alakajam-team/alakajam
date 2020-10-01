
const ll = `2048;"Maps";893
2059;"Paths";849
1965;"Ships";834
2119;"Moon";831
2113;"Explore!";767
1957;"Rain";756
2049;"Travel";754
1950;"Swarm";754
1990;"Clockwork";732
1953;"Cards";728
2024;"Separation";727
1944;"Chains";703
1991;"Clouds";661
1929;"Waves";608
2046;"Generation";560
1954;"Swap";505
1989;"Wind";412
1919;"Unknown language";351
2004;"Loops";263
1986;"Tubes";154`

console.log(ll.split('\n')
  .map(l => {
    const els = l.split(';')
    return `update theme set score = ${els[2]} where event_id = 32 and id = ${els[0]};`;
  })
  .join('\n'));