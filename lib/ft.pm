package ft;
use Dancer ':syntax';
use Dancer::Plugin::Ajax;
use Ship;
use Math::Trig ':pi';

our $VERSION = '0.1';

my $ship = Ship->new( id => 'HM', velocity => 10 );

get '/' => sub {
    template 'index';
};

ajax  '/radar' => sub {
    return to_json ( {
        ships => [
            {
                id => $ship->id,
                location => {
                    x => $ship->x,
                    y => $ship->y,
                },
                heading => $ship->heading,
            },
        ],
    } );
};

ajax '/plot_course' => sub {
    my @log = $ship->set_course( params->{course} );

    return to_json({
        log => \@log,
        trajectory => $ship->trajectory,
    });
};

ajax '/move' => sub {
    my @log = $ship->set_course( params->{course} );

    push @log, $ship->move;

    return to_json({
        log => \@log,
        id => $ship->id,
        trajectory => $ship->trajectory,
        heading => 180 * $ship->heading / pi,
    });
};

true;
